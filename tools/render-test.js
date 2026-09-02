#!/usr/bin/env node
/* ==========================================================================
   MVHA render test
   --------------------------------------------------------------------------
   Loads each interactive page in a simulated browser (jsdom), runs site.js
   against the real /data JSON files, and checks that the timeline, photo
   archive, events, board and search actually render.

   Requires jsdom:   npm install jsdom
   Run it with:      node tools/render-test.js

   This is a developer convenience. You do not need it to publish the site.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (e) {
  try {
    ({ JSDOM } = require('/tmp/node_modules/jsdom'));
  } catch (e2) {
    console.error('jsdom is not installed. Run: npm install jsdom');
    process.exit(0);
  }
}

const ROOT = path.resolve(__dirname, '..');
let failures = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log('  ok    ' + label);
  } else {
    console.log('  FAIL  ' + label + (detail ? ' — ' + detail : ''));
    failures++;
  }
}

async function render(page, query) {
  const url = 'http://localhost/' + page + (query || '');
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, page), 'utf8'), {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const w = dom.window;

  // Serve /data/*.json from disk.
  w.fetch = (target) => {
    const rel = String(target).replace(/^\.\.\//, '').replace(/^\//, '');
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
    }
    const text = fs.readFileSync(file, 'utf8');
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
  };
  w.CSS = w.CSS || { escape: s => String(s).replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c) };
  w.URL.createObjectURL = () => 'blob:stub';
  w.URL.revokeObjectURL = () => {};

  w.eval(fs.readFileSync(path.join(ROOT, 'assets/js/site.js'), 'utf8'));

  // Let the async data loads settle.
  await new Promise(r => setTimeout(r, 300));
  return w.document;
}

(async function () {
  console.log('\nTimeline');
  let doc = await render('timeline.html');
  const tlItems = doc.querySelectorAll('[data-timeline] .tl-item');
  check(`renders milestones (${tlItems.length})`, tlItems.length > 80);
  check('renders era filter chips', doc.querySelectorAll('[data-timeline-filters] .chip').length === 7);
  check('shows a milestone count', /milestone/.test(doc.querySelector('[data-timeline-count]').textContent));
  check('first entry is the earliest', /Pre-1770/.test(tlItems[0].textContent), tlItems[0] && tlItems[0].textContent.slice(0, 40));

  console.log('\nPhotographs');
  doc = await render('archive.html');
  const photos = doc.querySelectorAll('[data-gallery] .photo');
  check(`shows one screenful, not the lot (${photos.length})`, photos.length === 60);
  check('every photo has an image with alt text',
    [...photos].every(p => p.querySelector('img') && p.querySelector('img').alt));
  check('thumbnails come from the Internet Archive',
    [...photos].some(p => /archive\.org\/services\/img\//.test(p.querySelector('img').src)));
  check('decade dropdown populated', doc.querySelectorAll('[data-archive-decade] option').length > 8);
  check('undated pictures can be filtered for',
    [...doc.querySelectorAll('[data-archive-decade] option')].some(o => o.value === 'unknown'));
  check('topic dropdown merges both files', doc.querySelectorAll('[data-archive-topic] option').length === 16);
  check('collection dropdown populated', doc.querySelectorAll('[data-archive-collection] option').length === 3);
  check('counts every match, not just the ones drawn',
    /Showing 60 of 1,340 photographs/.test(doc.querySelector('[data-archive-count]').textContent),
    doc.querySelector('[data-archive-count]').textContent);
  check('offers the next screenful', !!doc.querySelector('[data-gallery-more] [data-more]'));
  check('lightbox markup present', !!doc.querySelector('#lightbox [data-lb-img]'));
  check('lightbox can credit and link out',
    !!doc.querySelector('#lightbox [data-lb-credit]') && !!doc.querySelector('#lightbox [data-lb-link]'));
  check('mentions the oral histories left out',
    /oral history/i.test(doc.querySelector('[data-archive-note]').textContent),
    doc.querySelector('[data-archive-note]').textContent.slice(0, 60));

  console.log('\nPhotographs — deep link');
  doc = await render('archive.html', '?photo=mayfield-mall');
  check('opens the lightbox', doc.querySelector('#lightbox').classList.contains('is-open'));
  check('lightbox shows the right photo', /Mayfield Mall/.test(doc.querySelector('[data-lb-title]').textContent),
    doc.querySelector('[data-lb-title]').textContent);

  console.log('\nPhotographs — deep link past the first screenful');
  doc = await render('archive.html', '?photo=cmv_001240');
  check('draws enough of the gallery to reach it',
    doc.querySelectorAll('[data-gallery] .photo').length > 60,
    String(doc.querySelectorAll('[data-gallery] .photo').length));
  check('opens the lightbox', doc.querySelector('#lightbox').classList.contains('is-open'));

  console.log('\nBooks & Articles');
  doc = await render('books-articles.html');
  check('lists the most recent news, not all of it',
    doc.querySelectorAll('[data-news-list] .news-item').length > 0 &&
    doc.querySelectorAll('[data-news-list] .news-item').length <= 3,
    String(doc.querySelectorAll('[data-news-list] .news-item').length));

  console.log('\nEvents');
  doc = await render('events.html');
  const upcoming = doc.querySelector('[data-events-upcoming]').innerHTML;
  check('upcoming block renders', upcoming.length > 100);
  check('past events render', doc.querySelectorAll('[data-events-past] .event').length > 5);
  check('annual events render', doc.querySelectorAll('[data-events-annual] .card').length === 3);
  check('programme archive renders', doc.querySelectorAll('[data-events-archive] li').length > 15);
  // Looked for anywhere on the page rather than under "upcoming", because
  // whether the one event that has a flyer is still in the future depends on
  // the day this is run.
  check('an event with a flyer shows it',
    !!doc.querySelector('.event--illustrated .event-thumb img'),
    doc.querySelectorAll('.event--illustrated').length + ' illustrated');
  check('every event title links to that event on its own',
    [...doc.querySelectorAll('.event .event-body h3 a')].every(a => /events\.html\?event=/.test(a.getAttribute('href'))),
    doc.querySelector('.event .event-body h3 a') ? doc.querySelector('.event .event-body h3 a').getAttribute('href') : 'no link');
  check('past events can be opened too',
    doc.querySelectorAll('[data-events-past] [data-event-open]').length > 5);
  check('the detail panel starts closed',
    !doc.querySelector('#event-detail').classList.contains('is-open'));

  console.log('\nEvents — one event in full');
  doc = await render('events.html', '?event=sharing-the-spirit-2026');
  const ed = doc.querySelector('#event-detail');
  check('opens the panel', ed.classList.contains('is-open'));
  check('names the event', /Sharing the Spirit/.test(doc.querySelector('[data-ed-title]').textContent),
    doc.querySelector('[data-ed-title]').textContent);
  check('gives the date in full', /August/.test(doc.querySelector('[data-ed-when]').textContent),
    doc.querySelector('[data-ed-when]').textContent);
  check('links the address to a map',
    /google\.com\/maps/.test(doc.querySelector('[data-ed-where]').innerHTML));
  check('shows the flyer', !doc.querySelector('[data-ed-img]').hidden);
  check('offers the map', /Open the map/.test(doc.querySelector('[data-ed-actions]').textContent),
    doc.querySelector('[data-ed-actions]').textContent.trim());

  doc = await render('events.html', '?event=walking-tour-2026-02');
  check('a past event says it is past',
    /^Held on/.test(doc.querySelector('[data-ed-when]').textContent),
    doc.querySelector('[data-ed-when]').textContent);
  check('says so honestly when no description was kept',
    /video gallery|Mountain ReView/.test(doc.querySelector('[data-ed-desc]').innerHTML));
  check('offers no Register button for something already held',
    !/Register/.test(doc.querySelector('[data-ed-actions]').textContent),
    doc.querySelector('[data-ed-actions]').textContent.trim());

  doc = await render('events.html', '?event=not-a-real-event');
  check('an address that names nothing just shows the page',
    !doc.querySelector('#event-detail').classList.contains('is-open'));

  console.log('\nBoard of Directors');
  doc = await render('about.html');
  check('renders board members', doc.querySelectorAll('[data-board] .person').length === 12);
  check('each member has a role', [...doc.querySelectorAll('[data-board] .person')].every(p => p.querySelector('.role').textContent.trim()));

  console.log('\nSite search');
  doc = await render('search.html', '?q=castro');
  const results = doc.querySelectorAll('[data-search-results] li');
  check(`finds results for "castro" (${results.length})`, results.length > 10);
  check('results are categorised', [...results].some(r => /Photograph|Timeline|Page/.test(r.querySelector('.kind').textContent)));
  check('search terms are highlighted', doc.querySelector('[data-search-results]').innerHTML.includes('<mark>'));

  doc = await render('search.html', '?q=hangar%20one');
  check('multi-word search works', doc.querySelectorAll('[data-search-results] li').length > 0);

  doc = await render('search.html', '?q=zzzznotathing');
  check('handles no results gracefully', /No results/.test(doc.querySelector('[data-search-summary]').textContent));

  console.log('\nNewsletter archive');
  // Assert against the data file rather than hard-coded counts, so these tests
  // stay honest as issues are added and indexed.
  const newsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/newsletters.json'), 'utf8'));
  const expectedIssues = newsData.issues.length;
  const expectedSearchable = newsData.issues.filter(i => (i.text || '').length > 200).length;

  doc = await render('newsletters.html');
  const issues = doc.querySelectorAll('[data-newsletters] .issue');
  check(`lists every issue in the data file (${issues.length})`,
    issues.length === expectedIssues, `${issues.length} shown, ${expectedIssues} in data`);
  check('no issue is listed twice',
    new Set(newsData.issues.map(i => i.id)).size === expectedIssues);
  check('each issue links to its PDF',
    [...issues].every(i => /\.pdf$/i.test(i.querySelector('a').getAttribute('href'))));
  check('PDF links open in a new tab safely',
    [...doc.querySelectorAll('[data-newsletters] a')].every(a => /noopener/.test(a.rel)));
  check('summary names the year range covered',
    /\d{4}–\d{4}/.test(doc.querySelector('[data-newsletter-note]').textContent),
    doc.querySelector('[data-newsletter-note]').textContent.slice(0, 70));

  const yearHeads = [...doc.querySelectorAll('.issue-year-head')].map(h => parseInt(h.textContent, 10));
  check(`groups issues by year (${yearHeads.length} years)`, yearHeads.length >= 8);
  check('years run newest to oldest',
    yearHeads.every((y, n) => n === 0 || yearHeads[n - 1] > y),
    yearHeads.join(', '));
  check('newest issue first overall', /Summer 2026/.test(issues[0].textContent),
    issues[0] && issues[0].textContent.replace(/\s+/g, ' ').slice(0, 40));
  check('within a year, newest season first',
    (() => {
      const y2025 = [...doc.querySelectorAll('.issue-year')]
        .find(s => /^2025/.test(s.querySelector('.issue-year-head').textContent));
      if (!y2025) return false;
      const seasons = [...y2025.querySelectorAll('.season')].map(s => s.textContent);
      return seasons.join(',') === 'Fall,Summer,Spring,Winter';
    })(),
    (() => {
      const y = [...doc.querySelectorAll('.issue-year')]
        .find(s => /^2025/.test(s.querySelector('.issue-year-head').textContent));
      return y ? [...y.querySelectorAll('.season')].map(s => s.textContent).join(',') : 'no 2025';
    })());
  check('every issue shows its season and year at a glance',
    [...issues].every(i => i.querySelector('.season') && i.querySelector('.year')));
  check('the searchable badge matches the data',
    doc.querySelectorAll('.tag--on').length === expectedSearchable,
    `${doc.querySelectorAll('.tag--on').length} badged, ${expectedSearchable} indexed in data`);
  check('no Joomag iframe left on the page', !doc.querySelector('iframe[src*="joomag"]'));
  check('every issue shows a publication month',
    [...issues].every(i => /January|April|July|October/.test(i.querySelector('.issue-meta').textContent)));
  check('unindexed issues still say something useful',
    [...issues].filter(i => !i.querySelector('.tag--on'))
      .every(i => i.querySelector('.issue-lede') || i.querySelector('.issue-topics')));
  check('Winter issues file under their own year, not the previous one',
    (() => {
      const y2026 = [...doc.querySelectorAll('.issue-year')]
        .find(s => /^2026/.test(s.querySelector('.issue-year-head').textContent));
      if (!y2026) return false;
      const titles = [...y2026.querySelectorAll('.issue-body h3')].map(h => h.textContent.trim());
      return titles.includes('Winter 2026') && titles.includes('Summer 2026');
    })(),
    (() => {
      const y = [...doc.querySelectorAll('.issue-year')]
        .find(s => /^2026/.test(s.querySelector('.issue-year-head').textContent));
      return y ? [...y.querySelectorAll('.issue-body h3')].map(h => h.textContent.trim()).join(', ') : 'no 2026 group';
    })());
  check('no issue is filed under a year its title contradicts',
    [...doc.querySelectorAll('.issue-year')].every(sec => {
      const y = sec.querySelector('.issue-year-head').textContent.trim().slice(0, 4);
      return [...sec.querySelectorAll('.issue-body h3')].every(h => h.textContent.trim().endsWith(y));
    }));

  console.log('\nNewsletter full-text search');
  doc = await render('search.html', '?q=vonnegut');
  let nres = [...doc.querySelectorAll('[data-search-results] li')];
  check('finds a name that only appears inside a PDF', nres.length > 0);
  check('labels it as a Newsletter result',
    nres.length > 0 && /Newsletter/.test(nres[0].querySelector('.kind').textContent),
    nres.length > 0 ? nres[0].querySelector('.kind').textContent : 'no results');
  check('shows the passage it matched',
    nres.length > 0 && /Indianapolis|Kurt|hardware/i.test(nres[0].querySelector('p').textContent),
    nres.length > 0 ? nres[0].querySelector('p').textContent.slice(0, 90) : '');

  doc = await render('search.html', '?q=easy%20street');
  nres = [...doc.querySelectorAll('[data-search-results] li')];
  check('finds a street-name story inside a PDF', nres.length > 0);
  check('every result shows a passage containing the search words',
    nres.every(r => /easy|street/i.test(r.querySelector('p').textContent)),
    nres.length ? nres[0].querySelector('p').textContent.slice(0, 80) : 'no results');

  doc = await render('search.html', '?q=seppich');
  nres = [...doc.querySelectorAll('[data-search-results] li')];
  check('finds a surname that only appears mid-article',
    nres.length > 0 && /Seppich/i.test(nres[0].querySelector('p').textContent),
    nres.length ? nres[0].querySelector('p').textContent.slice(0, 90) : 'no results');

  doc = await render('search.html', '?q=time%20capsule');
  check('finds the 1976 time capsule', doc.querySelectorAll('[data-search-results] li').length > 0);

  console.log('\nAdvanced search — source filters');
  doc = await render('search.html', '?q=castro');
  const sources = [...doc.querySelectorAll('[data-search-sources] .source')];
  check(`offers one filter per source (${sources.length})`, sources.length === 5,
    sources.map(s => s.textContent.trim().split(/\s+/)[0]).join(', '));
  check('all sources are on by default',
    sources.every(s => s.querySelector('input').checked));
  check('each filter shows a live count',
    sources.every(s => /^[\d,]+$/.test(s.querySelector('.source-count').textContent)),
    sources.map(s => s.querySelector('.source-count').textContent).join(' / '));
  const sourceTotal = sources.reduce(
    (n, s) => n + parseInt(s.querySelector('.source-count').textContent.replace(/,/g, ''), 10), 0);
  check('per-source counts add up to the total reported',
    new RegExp('^' + sourceTotal + ' results').test(doc.querySelector('[data-search-summary]').textContent),
    `${sources.map(s => s.querySelector('.source-count').textContent).join('+')} = ${sourceTotal}; ` +
    `summary says "${doc.querySelector('[data-search-summary]').textContent.slice(0, 40)}"`);
  check('says so when the list is capped',
    sourceTotal <= 60 || /Showing the best 60 of/.test(doc.querySelector('.more-results').textContent),
    doc.querySelector('.more-results') ? doc.querySelector('.more-results').textContent : 'no cap notice');
  check('points at the directories for people and addresses',
    /Historical Directories/.test(doc.querySelector('.callout').textContent));

  // Switching a source off should remove exactly that source's results.
  doc = await render('search.html', '?q=castro');
  const photoCount = parseInt(
    doc.querySelector('[data-count-for="Photograph"]').textContent.replace(/,/g, ''), 10);
  const before = doc.querySelectorAll('[data-search-results] li.more-results').length
    ? Infinity : doc.querySelectorAll('[data-search-results] li').length;
  const photoBox = [...doc.querySelectorAll('[data-search-sources] input')]
    .find(i => i.value === 'Photograph');
  photoBox.checked = false;
  photoBox.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 100));
  check('unticking a source drops its results',
    ![...doc.querySelectorAll('[data-search-results] .kind')].some(k => k.textContent === 'Photograph'),
    `${photoCount} photo results were showing`);
  check('and says how many are now hidden',
    /switched off/.test(doc.querySelector('[data-search-summary]').textContent),
    doc.querySelector('[data-search-summary]').textContent.slice(0, 70));

  // Unticking everything would be a dead end, so it should refuse.
  [...doc.querySelectorAll('[data-search-sources] input')].forEach(i => { i.checked = false; });
  doc.querySelector('[data-search-sources] input').dispatchEvent(
    new doc.defaultView.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 100));
  check('refuses to let you untick every source',
    [...doc.querySelectorAll('[data-search-sources] input')].every(i => i.checked));

  console.log('\nHistorical directories');
  const dirData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/directory_index.json'), 'utf8'));
  doc = await render('directories.html');
  check(`loads the index (${dirData.count.toLocaleString()} entries)`, dirData.count > 80000);
  // Checked against the data file rather than a number typed in here, so that
  // adding directory years does not turn this test red for no reason.
  check('states how many entries there are',
    doc.querySelector('[data-dir-meta]').textContent.includes(dirData.count.toLocaleString('en-US') + ' entries'),
    doc.querySelector('[data-dir-meta]').textContent);
  check('year dropdowns are populated',
    doc.querySelectorAll('[data-dir-from] option').length === dirData.years.length,
    `${doc.querySelectorAll('[data-dir-from] option').length} of ${dirData.years.length}`);
  check('year range defaults to the full span',
    doc.querySelector('[data-dir-from]').value === dirData.years[0] &&
    doc.querySelector('[data-dir-to]').value === dirData.years[dirData.years.length - 1]);
  check('offers Business / Residence / Unlisted chips',
    doc.querySelectorAll('[data-dir-kinds] .chip').length === 3);
  check('waits for a search rather than dumping 85,000 rows',
    doc.querySelectorAll('[data-dir-results] tr').length === 0 &&
    /search above/.test(doc.querySelector('[data-dir-status]').textContent),
    doc.querySelector('[data-dir-status]').textContent.slice(0, 50));

  doc = await render('directories.html', '?q=rengstorff');
  const dirRows = doc.querySelectorAll('[data-dir-results] tr');
  check(`a preset search returns listings (${dirRows.length})`, dirRows.length > 0);
  check('every row shows a year', [...dirRows].every(r => /^\d{4}$/.test(r.querySelector('.dir-year').textContent)));
  check('the search term is highlighted', doc.querySelector('[data-dir-results]').innerHTML.includes('<mark>'));
  check('listings are grouped by name', doc.querySelectorAll('.dir-group').length > 0);
  check('groups show a year span and count',
    /listing.*·/.test(doc.querySelector('.dir-group-meta').textContent),
    doc.querySelector('.dir-group-meta') && doc.querySelector('.dir-group-meta').textContent.slice(0, 60));

  doc = await render('directories.html', '?q=zzzznotarealname');
  check('handles no matches gracefully',
    /No matches/.test(doc.querySelector('[data-dir-status]').textContent));

  console.log('\nNavigation');
  doc = await render('events.html');
  check('marks the current page in the nav',
    !!doc.querySelector('#site-nav a[aria-current="page"]'),
    doc.querySelector('#site-nav a[aria-current="page"]') && doc.querySelector('#site-nav a[aria-current="page"]').textContent);

  console.log('\n' + '-'.repeat(50));
  console.log(failures ? `${failures} failure(s)` : 'All render tests passed.');
  process.exit(failures ? 1 : 0);
})();
