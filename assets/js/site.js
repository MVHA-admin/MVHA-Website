/* ==========================================================================
   Mountain View Historical Association — site.js
   --------------------------------------------------------------------------
   One script for the whole site. Each block below only runs if the matching
   element exists on the page, so it is safe to include everywhere.

   Content lives in the /data folder as .json files. You should never need to
   edit this file to change words, events, photos or timeline entries.
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------
     Small helpers
     -------------------------------------------------------------------- */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /**
   * Where the site's root is, as a prefix for loading /data files.
   *
   * Worked out from this script's own address rather than the page address,
   * so it is correct however the site is published — at the root of a domain,
   * in a subfolder such as example.com/mvhistory/, or anywhere else.
   */
  const BASE = (function () {
    const script = document.currentScript ||
      Array.prototype.slice.call(document.querySelectorAll('script[src]')).pop();
    if (script && script.src) {
      const m = script.src.match(/^(.*\/)assets\/js\/[^/]+$/);
      if (m) {
        // Keep it relative to the current page so it works over file:// too.
        try {
          const root = new URL(m[1]);
          const here = new URL('.', window.location.href);
          if (root.origin === here.origin) {
            const from = here.pathname.split('/').filter(Boolean);
            const to = root.pathname.split('/').filter(Boolean);
            let same = 0;
            while (same < from.length && same < to.length && from[same] === to[same]) same++;
            return '../'.repeat(from.length - same) + to.slice(same).join('/') +
                   (to.length - same ? '/' : '');
          }
        } catch (e) { /* fall through */ }
        return m[1];
      }
    }
    return '';
  })();

  /** Escape text before putting it into HTML. */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Load a JSON file from /data. Returns null (and warns) on failure. */
  const dataCache = {};
  /* Puts the extracted text back beside each issue. Used by the Newsletters
     page and by the site search, which both need the two files as one. */
  function joinNewsletterText(list, textFile) {
    const found = (textFile && textFile.issues) || {};
    (list && list.issues || []).forEach(function (issue) {
      const extra = found[issue.id];
      if (!extra) return;
      if (extra.text) issue.text = extra.text;
      if (extra.pages) issue.pages = extra.pages;
      if (extra.words) issue.words = extra.words;
    });
    return list;
  }

  async function loadData(name) {
    if (dataCache[name]) return dataCache[name];
    try {
      const res = await fetch(BASE + 'data/' + name + '.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const json = await res.json();
      dataCache[name] = json;
      return json;
    } catch (err) {
      console.warn('Could not load data/' + name + '.json —', err.message,
        '\nIf you are opening the site by double-clicking the file, use a local web server instead. See README.md.');
      return null;
    }
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  /** Parse a YYYY-MM-DD string as a local date (avoids timezone drift). */
  function parseDate(str) {
    const [y, m, d] = String(str).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function formatDateLong(str) {
    const d = parseDate(str);
    return MONTHS_LONG[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /* ====================================================================
     1. Mobile navigation
     ==================================================================== */

  (function initNav() {
    const toggle = $('.nav-toggle');
    const nav = $('#site-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.nav-toggle-label').textContent = open ? 'Close' : 'Menu';
    });

    // Close the menu when a link inside it is followed.
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Mark the current page in the navigation.
    const here = window.location.pathname.split('/').pop() || 'index.html';
    $$('#site-nav a').forEach(function (a) {
      const target = a.getAttribute('href');
      if (target && target.split('/').pop() === here) {
        a.setAttribute('aria-current', 'page');
      }
    });
  })();

  /* ====================================================================
     2. Header search box → search page
     ==================================================================== */

  (function initHeaderSearch() {
    $$('form[data-search-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const q = form.querySelector('input').value.trim();
        window.location.href = BASE + 'search.html' + (q ? '?q=' + encodeURIComponent(q) : '');
      });
    });
  })();

  /* ====================================================================
     3. Timeline page
     ==================================================================== */

  (async function initTimeline() {
    const mount = $('[data-timeline]');
    if (!mount) return;

    const data = await loadData('timeline');
    if (!data) { mount.innerHTML = fallbackMessage(); return; }

    const filters = $('[data-timeline-filters]');
    const counter = $('[data-timeline-count]');
    let activeEra = 'all';

    if (filters) {
      const eras = [{ id: 'all', label: 'All eras' }].concat(data.eras);
      filters.innerHTML = eras.map(function (era, i) {
        return '<button type="button" class="chip" data-era="' + esc(era.id) + '" aria-pressed="' +
          (i === 0 ? 'true' : 'false') + '">' + esc(era.label) + '</button>';
      }).join('');

      filters.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-era]');
        if (!btn) return;
        activeEra = btn.dataset.era;
        $$('[data-era]', filters).forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        render();
      });
    }

    function render() {
      const items = data.entries
        .filter(function (e) { return activeEra === 'all' || e.era === activeEra; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });

      mount.innerHTML = items.map(function (e) {
        return '<li class="tl-item">' +
          '<div class="tl-year">' + esc(e.year) + '</div>' +
          '<div class="tl-body"><h3>' + esc(e.title) + '</h3><p>' + esc(e.text) + '</p></div>' +
        '</li>';
      }).join('');

      if (counter) {
        counter.textContent = items.length + ' milestone' + (items.length === 1 ? '' : 's');
      }
    }

    render();
  })();

  /* ====================================================================
     4. Photo archive: filtering + lightbox
     ==================================================================== */

  (async function initArchive() {
    const mount = $('[data-gallery]');
    if (!mount) return;

    /* Two sources, one gallery.
       photos.json holds the photographs the Association added itself through
       the editing panel. photos-ia.json is the catalogue of everything the
       History Center and the City library digitised through California
       Revealed, which lives permanently on the Internet Archive -- we keep no
       copy of those and show the Archive's own thumbnail. If either file is
       missing the page still works with the other. */
    const results = await Promise.all([loadData('photos'), loadData('photos-ia')]);
    const own = results[0], ia = results[1];
    if (!own && !ia) { mount.innerHTML = fallbackMessage(); return; }

    /* Only the identifier is stored for an Archive photograph. All three of
       its addresses are built from it here, which keeps photos-ia.json about a
       third smaller than it would otherwise be. */
    function fromArchive(p) {
      const base = 'https://archive.org/';
      return {
        id: p.id, title: p.title, date: p.date, decade: p.decade, topic: p.topic,
        caption: p.caption, collection: p.collection, creator: p.creator || '',
        rights: p.pd ? 'Public domain. No restrictions on use.' : 'Copyright status unknown.',
        src: base + 'services/img/' + p.id,
        full: base + 'download/' + p.id + '/' + p.id + (p.many ? '_f00001' : '') + '_access.jpg',
        link: base + 'details/' + p.id
      };
    }

    const photos = ((own && own.photos) || []).concat(((ia && ia.photos) || []).map(fromArchive));

    /* Both files arrive in their own order, and simply putting one after the
       other looks like no order at all. The gallery is one collection, so it
       is sorted as one: oldest first, and anything with no date at the end
       rather than scattered through the middle.

       The year is read out of the date as it is written, because that is the
       only date these have -- "1906", "June 1917", "circa 1953" and
       "3 June 1937" all appear, and all of them start being useful at the
       four digits. Where there is no date at all the decade stands in. */
    function yearOf(p) {
      const m = /\d{4}/.exec(p.date || '');
      if (m) return Number(m[0]);
      if (typeof p.decade === 'number') return p.decade;
      return Infinity;
    }
    photos.forEach(function (p) { p.year = yearOf(p); });
    photos.sort(function (a, b) {
      if (a.year !== b.year) return a.year - b.year;
      return a.title.localeCompare(b.title);
    });

    const qInput = $('[data-archive-search]');
    const decadeSel = $('[data-archive-decade]');
    const topicSel = $('[data-archive-topic]');
    const placeSel = $('[data-archive-collection]');
    const counter = $('[data-archive-count]');
    const moreWrap = $('[data-gallery-more]');
    const notice = $('[data-archive-note]');

    /* A page that tried to load thirteen hundred thumbnails at once would take
       a long time to settle and would ask a great deal of the Internet Archive
       for pictures nobody had scrolled to. So a screenful is shown, with a
       button for the next. */
    const PAGE = 60;
    let shown = PAGE;
    let visible = photos.slice();

    function count(n) { return n.toLocaleString ? n.toLocaleString('en-US') : String(n); }

    // Populate the filter menus from the data itself.
    if (decadeSel) {
      const decades = Array.from(new Set(photos.map(function (p) { return p.decade; })))
        .filter(function (d) { return typeof d === 'number'; })
        .sort(function (a, b) { return a - b; });
      decadeSel.insertAdjacentHTML('beforeend', decades.map(function (d) {
        return '<option value="' + d + '">' + d + 's</option>';
      }).join('') + '<option value="unknown">No date recorded</option>');
    }
    if (topicSel) {
      const order = ((own && own.topics) || []).concat((ia && ia.topics) || []);
      const seen = {};
      const topics = order.filter(function (t) {
        if (!t || seen[t]) return false; seen[t] = true; return true;
      });
      topicSel.insertAdjacentHTML('beforeend', topics.map(function (t) {
        return '<option value="' + esc(t) + '">' + esc(t) + '</option>';
      }).join(''));
    }
    /* Which collection holds a photograph is a different question from who took
       it: photos.json may carry a photographer's credit, and everything in it
       belongs to the Association. */
    const OURS = 'Mountain View Historical Association';
    photos.forEach(function (p) { if (!p.collection) p.collection = OURS; });

    if (placeSel) {
      const places = Array.from(new Set(photos.map(function (p) { return p.collection; })))
        .filter(Boolean).sort();
      placeSel.insertAdjacentHTML('beforeend', places.map(function (c) {
        return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
      }).join(''));
    }
    if (notice && ia && ia.oralHistories) {
      notice.innerHTML = 'The same collections hold ' + ia.oralHistories +
        ' recorded oral history interviews, which are not photographs and so are not listed here. ' +
        '<a href="https://archive.org/search?query=collection%3Amountainviewlibrary+AND+title%3A%22Interview+with%22" target="_blank" rel="noopener">Listen to them on the Internet Archive</a>.';
    }

    function card(p, i) {
      return '<button type="button" class="photo" data-index="' + i + '" data-id="' + esc(p.id) + '">' +
        '<span class="photo-img"><img src="' + esc(p.src) + '" alt="' + esc(p.title) + '" loading="lazy"></span>' +
        '<span class="photo-meta">' +
          '<span class="date">' + esc(p.date || 'Date unknown') + '</span>' +
          '<h3>' + esc(p.title) + '</h3>' +
          (p.caption ? '<p>' + esc(p.caption) + '</p>' : '') +
        '</span>' +
      '</button>';
    }

    function draw() {
      mount.innerHTML = visible.length
        ? visible.slice(0, shown).map(card).join('')
        : '<div class="empty-state"><p>No photographs match those filters. Try clearing the search box or choosing “All”.</p></div>';

      if (counter) {
        counter.textContent = visible.length
          ? 'Showing ' + count(Math.min(shown, visible.length)) + ' of ' + count(visible.length) +
            ' photograph' + (visible.length === 1 ? '' : 's')
          : 'No photographs found';
      }
      if (moreWrap) {
        const left = visible.length - shown;
        moreWrap.innerHTML = left > 0
          ? '<button type="button" class="btn btn--ghost" data-more>Show ' +
            count(Math.min(PAGE, left)) + ' more</button>'
          : '';
      }
    }

    function apply() {
      const q = (qInput && qInput.value.trim().toLowerCase()) || '';
      const dec = (decadeSel && decadeSel.value) || '';
      const top = (topicSel && topicSel.value) || '';
      const place = (placeSel && placeSel.value) || '';

      visible = photos.filter(function (p) {
        if (dec === 'unknown') { if (typeof p.decade === 'number') return false; }
        else if (dec && String(p.decade) !== dec) return false;
        if (top && p.topic !== top) return false;
        if (place && p.collection !== place) return false;
        if (q) {
          const hay = [p.title, p.caption, p.date, p.topic, p.creator].join(' ').toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      shown = PAGE;
      draw();
    }

    if (qInput) qInput.addEventListener('input', apply);
    if (decadeSel) decadeSel.addEventListener('change', apply);
    if (topicSel) topicSel.addEventListener('change', apply);
    if (placeSel) placeSel.addEventListener('change', apply);
    if (moreWrap) {
      moreWrap.addEventListener('click', function (e) {
        if (!e.target.closest('[data-more]')) return;
        shown += PAGE;
        const first = visible.length;
        draw();
        const next = mount.children[Math.min(shown - PAGE, first - 1)];
        if (next && next.focus) next.focus();
      });
    }
    apply();

    /* ---- Lightbox ---- */

    const box = $('#lightbox');
    if (!box) return;
    const boxImg = $('[data-lb-img]', box);
    const boxTitle = $('[data-lb-title]', box);
    const boxText = $('[data-lb-text]', box);
    const boxLink = $('[data-lb-link]', box);
    const boxCredit = $('[data-lb-credit]', box);
    let current = 0;
    let lastFocus = null;

    function show(i) {
      if (!visible.length) return;
      current = (i + visible.length) % visible.length;
      const p = visible[current];

      /* The Archive serves a large copy under a predictable address, but a
         handful of items are filed differently. If the large copy does not
         load, fall back to the thumbnail rather than showing a broken frame --
         the link below it always goes to the item itself. */
      boxImg.onerror = function () { boxImg.onerror = null; boxImg.src = p.src; };
      boxImg.src = p.full || p.src;
      boxImg.alt = p.title;
      boxTitle.textContent = p.title;
      boxText.textContent = [p.date, p.caption].filter(Boolean).join(' — ');
      if (boxCredit) {
        boxCredit.textContent = [p.creator, p.credit, p.collection, p.rights].filter(Boolean).join(' · ');
      }
      if (boxLink) {
        if (p.link) {
          boxLink.href = p.link;
          boxLink.hidden = false;
        } else {
          boxLink.hidden = true;
        }
      }
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      $('.lightbox-close', box).focus();
    }

    function hide() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }

    mount.addEventListener('click', function (e) {
      const card = e.target.closest('.photo');
      if (!card) return;
      lastFocus = card;
      show(Number(card.dataset.index));
    });

    box.addEventListener('click', function (e) {
      if (e.target === box) hide();
      if (e.target.closest('.lightbox-close')) hide();
      if (e.target.closest('.lightbox-prev')) show(current - 1);
      if (e.target.closest('.lightbox-next')) show(current + 1);
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') hide();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    // Deep link: archive.html?photo=some-id opens straight to that photograph,
    // even when it sits far past the first screenful.
    const wanted = new URLSearchParams(window.location.search).get('photo');
    if (wanted) {
      const idx = visible.findIndex(function (p) { return p.id === wanted; });
      if (idx > -1) {
        if (idx >= shown) { shown = Math.ceil((idx + 1) / PAGE) * PAGE; draw(); }
        const card = $('[data-id="' + CSS.escape(wanted) + '"]', mount);
        if (card) {
          lastFocus = card;
          if (typeof card.scrollIntoView === 'function') card.scrollIntoView({ block: 'center' });
        }
        show(idx);
      }
    }
  })();

  /* ====================================================================
     5. Events
     ==================================================================== */

  (async function initEvents() {
    const upcomingMount = $('[data-events-upcoming]');
    const pastMount = $('[data-events-past]');
    const annualMount = $('[data-events-annual]');
    const archiveMount = $('[data-events-archive]');
    const homeMount = $('[data-events-home]');
    if (!upcomingMount && !pastMount && !annualMount && !archiveMount && !homeMount) return;

    const data = await loadData('events');
    if (!data) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);

    /* One list of events, in whatever order it happens to be in. Which of them
       are still to come is decided here, by the date, so that nobody editing
       the site has to move an event from one list to another on the morning
       after it happened.

       'upcoming' and 'past' are the shape the file used to have, and are still
       read so that an older copy of the data -- or a browser holding one in its
       cache -- does not empty the page. */
    const all = (data.events || []).concat(data.upcoming || [], data.past || []);
    const upcoming = all.filter(function (e) { return parseDate(e.date) >= today; })
                        .sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });
    const past = all.filter(function (e) { return parseDate(e.date) < today; })
                    .sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });

    /* Every event needs a name of its own, because each one can now be opened
       on its own and linked to. Most carry an id already; anything older that
       does not gets one made from its date and title. */
    function slugFor(e) {
      if (e.id) return e.id;
      return (e.date + '-' + e.title).toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    }

    const byId = {};
    all.forEach(function (e) { byId[slugFor(e)] = e; });

    /* Descriptions are written in the editing panel as plain text, with a blank
       line between paragraphs. That is turned into real paragraphs here rather
       than asking board members to write HTML. */
    function paragraphs(text) {
      return String(text || '').split(/\n\s*\n/)
        .map(function (para) { return para.trim(); })
        .filter(Boolean)
        .map(function (para) { return '<p>' + esc(para).replace(/\n/g, '<br>') + '</p>'; })
        .join('');
    }

    /* The list shows the opening of a description; the whole of it is one
       click away, so there is no sense in repeating it twice on one page. */
    function openingOf(text, n) {
      const first = String(text || '').split(/\n\s*\n/)[0].trim();
      if (first.length <= n) return first;
      const cut = first.slice(0, n);
      const stop = cut.lastIndexOf('. ');
      return stop > n * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…';
    }

    function mapUrl(e) {
      const where = [e.venue, e.address].filter(Boolean).join(', ');
      return where ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(where) : '';
    }

    function icsButton(e, label) {
      return '<a class="btn btn--ghost" href="#" data-ics=\'' + esc(JSON.stringify({
        title: e.title, date: e.date, venue: e.venue, address: e.address, description: e.description || ''
      })) + '\'>' + label + '</a>';
    }

    function eventCard(e, opts) {
      opts = opts || {};
      const d = parseDate(e.date);
      const id = slugFor(e);
      const href = BASE + 'events.html?event=' + encodeURIComponent(id);

      /* Nothing can be registered for or added to a calendar once it has
         happened, and an event moves itself into the past on the day. */
      const past = d < today;
      const actions = [];
      if (e.registerUrl && !past) {
        actions.push('<a class="btn btn--primary" href="' + esc(e.registerUrl) + '" target="_blank" rel="noopener">Register</a>');
      }
      if (!opts.compact && !past) actions.push(icsButton(e, 'Add to calendar'));

      /* The picture is decorative here -- the title beside it says the same
         thing and is the link a screen reader should read -- so it carries an
         empty alt and is skipped by the keyboard. */
      const thumb = e.image
        ? '<a class="event-thumb" href="' + href + '" data-event-open="' + esc(id) + '" tabindex="-1" aria-hidden="true">' +
            '<img src="' + esc(e.image) + '" alt="" loading="lazy"></a>'
        : '';

      return '<article class="event' + (e.image ? ' event--illustrated' : '') + '">' +
        '<div class="event-date">' +
          '<span class="mon">' + MONTHS[d.getMonth()] + '</span>' +
          '<span class="day">' + d.getDate() + '</span>' +
          '<span class="yr">' + d.getFullYear() + '</span>' +
        '</div>' +
        thumb +
        '<div class="event-body">' +
          '<h3><a href="' + href + '" data-event-open="' + esc(id) + '">' + esc(e.title) + '</a></h3>' +
          '<p class="where">' + esc([e.time, e.venue, e.address].filter(Boolean).join(' \u00b7 ')) + '</p>' +
          (e.description
            ? '<p class="desc">' + esc(openingOf(e.description, 180)) +
              ' <a href="' + href + '" data-event-open="' + esc(id) + '">More about this event &rarr;</a></p>'
            : '') +
        '</div>' +
        (actions.length ? '<div class="event-actions">' + actions.join('') + '</div>' : '') +
      '</article>';
    }

    const emptyUpcoming = '<div class="empty-state">' +
      '<p><strong>No events are scheduled right now.</strong></p>' +
      '<p>We hold quarterly membership meetings, usually on the first Sunday of February, May, August and November. ' +
      'Members hear about each one first — <a href="' + BASE + 'membership.html">join the Association</a> or ' +
      '<a href="' + esc(data.registrationUrl || '#') + '" target="_blank" rel="noopener">follow us on Eventbrite</a>.</p>' +
      '</div>';

    if (upcomingMount) {
      upcomingMount.innerHTML = upcoming.length ? upcoming.map(function (e) { return eventCard(e); }).join('') : emptyUpcoming;
    }
    if (homeMount) {
      homeMount.innerHTML = upcoming.length
        ? upcoming.slice(0, 2).map(function (e) { return eventCard(e, { compact: true }); }).join('')
        : emptyUpcoming;
    }
    if (pastMount) {
      pastMount.innerHTML = past.slice(0, 12).map(function (e) { return eventCard(e, { compact: true }); }).join('');
    }
    if (annualMount) {
      annualMount.innerHTML = (data.annual || []).map(function (a) {
        return '<div class="card"><div class="card-body">' +
          '<p class="eyebrow">' + esc(a.when) + '</p>' +
          '<h3>' + esc(a.title) + '</h3>' +
        '</div></div>';
      }).join('');
    }
    if (archiveMount) {
      archiveMount.innerHTML = (data.archive || []).map(function (yr) {
        return '<div><h3>' + esc(yr.year) + '</h3><ul>' +
          yr.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') +
        '</ul></div>';
      }).join('');
    }

    /* ---- One event, in full ----------------------------------------
       Events are read from data/events.json in the browser, so that the board
       can add one in the editing panel and see it straight away without a
       rebuild. That rules out giving each event a page of its own -- a page
       would only exist after a build. Instead the whole entry opens over the
       list, with an address of its own (events.html?event=...) that can be
       sent to somebody, and the browser's back button closes it. */

    const detail = $('#event-detail');
    if (detail) {
      const dImg = $('[data-ed-img]', detail);
      const dWhen = $('[data-ed-when]', detail);
      const dTitle = $('[data-ed-title]', detail);
      const dWhere = $('[data-ed-where]', detail);
      const dDesc = $('[data-ed-desc]', detail);
      const dActions = $('[data-ed-actions]', detail);
      let lastFocus = null;
      let pushed = false;

      function fill(e) {
        const d = parseDate(e.date);
        const past = d < today;

        if (e.image) {
          dImg.src = e.image;
          dImg.alt = 'Flyer for ' + e.title;
          dImg.hidden = false;
        } else {
          dImg.hidden = true;
          dImg.removeAttribute('src');
        }

        dWhen.textContent = (past ? 'Held on ' : '') + formatDateLong(e.date) +
          (e.time ? ' \u00b7 ' + e.time : '');
        dTitle.textContent = e.title;

        /* A map is worth having for something you are still going to go to.
           For an event that has already happened the venue is a fact about the
           past, so it is stated rather than linked. */
        const map = past ? '' : mapUrl(e);
        const where = esc([e.venue, e.address].filter(Boolean).join(', '));
        dWhere.innerHTML = where
          ? (map ? '<a href="' + map + '" target="_blank" rel="noopener">' + where + '</a>' : where)
          : '';

        /* Older entries were kept as a line in a list and never had a
           description. Saying so is better than an empty space. */
        dDesc.innerHTML = e.description
          ? paragraphs(e.description)
          : (past
              ? '<p>We have not kept a description of this one. Several past talks were recorded and are in the ' +
                '<a href="' + BASE + 'videos.html">video gallery</a>, and most were written up afterwards in ' +
                '<a href="' + BASE + 'newsletters.html">The Mountain ReView</a>.</p>'
              : '<p>Full details to follow.</p>');

        const acts = [];
        if (e.registerUrl && !past) {
          acts.push('<a class="btn btn--primary" href="' + esc(e.registerUrl) + '" target="_blank" rel="noopener">Register</a>');
        }
        if (!past) acts.push(icsButton(e, 'Add to calendar'));
        if (map) acts.push('<a class="btn btn--ghost" href="' + map + '" target="_blank" rel="noopener">Open the map</a>');
        dActions.innerHTML = acts.join('');
      }

      function openEvent(id, viaLink) {
        const e = byId[id];
        if (!e) return false;
        fill(e);
        detail.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        $('.lightbox-close', detail).focus();
        if (viaLink && window.history && history.pushState) {
          history.pushState({ event: id }, '', BASE + 'events.html?event=' + encodeURIComponent(id));
          pushed = true;
        }
        return true;
      }

      function closeEvent(fromHistory) {
        if (!detail.classList.contains('is-open')) return;
        detail.classList.remove('is-open');
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        if (!fromHistory && window.history && history.pushState) {
          if (pushed) { pushed = false; history.back(); }
          else history.replaceState({}, '', BASE + 'events.html');
        }
      }

      document.addEventListener('click', function (ev) {
        const link = ev.target.closest('[data-event-open]');
        if (link) {
          ev.preventDefault();
          lastFocus = link;
          openEvent(link.dataset.eventOpen, true);
          return;
        }
        if (ev.target === detail || ev.target.closest('#event-detail .lightbox-close')) closeEvent();
      });

      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && detail.classList.contains('is-open')) closeEvent();
      });

      window.addEventListener('popstate', function (ev) {
        const id = ev.state && ev.state.event;
        pushed = false;
        if (id) openEvent(id, false); else closeEvent(true);
      });

      // events.html?event=some-id opens straight to that event.
      const wanted = new URLSearchParams(window.location.search).get('event');
      if (wanted) openEvent(wanted, false);
    }

    // "Add to calendar" — builds an .ics file in the browser, no server needed.
    document.addEventListener('click', function (e) {
      const link = e.target.closest('[data-ics]');
      if (!link) return;
      e.preventDefault();
      const ev = JSON.parse(link.dataset.ics);
      const stamp = ev.date.replace(/-/g, '');
      const end = new Date(parseDate(ev.date).getTime() + 86400000);
      const endStamp = end.getFullYear() +
        String(end.getMonth() + 1).padStart(2, '0') +
        String(end.getDate()).padStart(2, '0');

      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MVHA//Events//EN',
        'BEGIN:VEVENT',
        'UID:' + stamp + '-mvha@mountainviewhistorical.org',
        'DTSTART;VALUE=DATE:' + stamp,
        'DTEND;VALUE=DATE:' + endStamp,
        'SUMMARY:' + ev.title,
        'LOCATION:' + [ev.venue, ev.address].filter(Boolean).join(', '),
        'DESCRIPTION:' + (ev.description || '').replace(/\n/g, ' '),
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');

      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = ev.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.ics';
      a.click();
      URL.revokeObjectURL(url);
    });
  })();

  /* ====================================================================
     6. Board of Directors
     ==================================================================== */

  (async function initBoard() {
    const mount = $('[data-board]');
    if (!mount) return;

    const data = await loadData('board');
    if (!data) { mount.innerHTML = fallbackMessage(); return; }

    const termLabel = $('[data-board-term]');
    if (termLabel && data.term) termLabel.textContent = data.term;

    mount.innerHTML = (data.members || []).map(function (m) {
      const photo = m.photo
        ? '<img class="person-photo" src="' + esc(m.photo) + '" alt="' + esc(m.name) + '" loading="lazy">'
        : '<div class="person-photo" aria-hidden="true"></div>';
      return '<div class="person">' + photo +
        '<h3>' + esc(m.name) + '</h3>' +
        '<p class="role">' + esc(m.role) + '</p>' +
        '<details><summary>Read bio</summary><p>' + esc(m.bio) + '</p></details>' +
      '</div>';
    }).join('');
  })();

  /* ====================================================================
     6b. News & Stories listing
     --------------------------------------------------------------------
     Each post also exists as its own page in /news, written out by
     tools/build.js. This only builds the list that links to them.
     ==================================================================== */

  (async function initNews() {
    const mount = $('[data-news-list]');
    if (!mount) return;

    const data = await loadData('posts');
    /* A page may ask for only the most recent few, by writing a number in the
       attribute: data-news-list="3". The News page itself leaves it empty and
       gets everything. */
    const limit = Number(mount.dataset.newsList) || 0;
    const all = (data && data.posts) || [];
    const posts = limit ? all.slice(0, limit) : all;

    if (!posts.length) {
      mount.innerHTML = '<div class="empty-state">' +
        '<p><strong>Nothing here just yet.</strong></p>' +
        '<p>News and short pieces from the archive will appear here. In the ' +
        'meantime, our <a href="' + BASE + 'newsletters.html">newsletter archive</a> ' +
        'goes back many years and is fully searchable.</p></div>';
      return;
    }

    mount.innerHTML = posts.map(function (p) {
      const thumb = p.image
        ? '<a class="news-thumb" href="' + BASE + esc(p.url) + '">' +
            '<img src="' + BASE + esc(p.image) + '" alt="" loading="lazy"></a>'
        : '';
      return '<article class="news-item">' + thumb +
        '<div class="news-body">' +
          '<p class="eyebrow"><time datetime="' + esc(p.date) + '">' +
            esc(formatDateLong(p.date)) + '</time>' +
            (p.author ? ' &middot; ' + esc(p.author) : '') + '</p>' +
          '<h2><a href="' + BASE + esc(p.url) + '">' + esc(p.title) + '</a></h2>' +
          '<p>' + esc(p.summary) + '</p>' +
          '<p><a class="more" href="' + BASE + esc(p.url) + '">Read on &rarr;</a></p>' +
        '</div>' +
      '</article>';
    }).join('');
  })();

  /* ====================================================================
     7. Newsletter archive
     ==================================================================== */

  (async function initNewsletters() {
    const mount = $('[data-newsletters]');
    if (!mount) return;

    /* Two files, joined by issue id.
       newsletters.json is the list, and is what the editing panel writes when a
       board member adds an issue. newsletter-text.json is the text pulled out of
       each PDF by tools/index_newsletters.py. They are kept apart so that saving
       in the panel cannot wipe the search index — an issue added there simply has
       no text yet, and shows as "Not yet indexed" until the indexer has run. */
    const results = await Promise.all([loadData('newsletters'), loadData('newsletter-text')]);
    const data = results[0];
    if (!data) { mount.innerHTML = fallbackMessage(); return; }
    joinNewsletterText(data, results[1]);

    // Note: always use parseDate, never new Date('YYYY-MM-DD'). The latter is
    // read as UTC midnight, which lands on 31 December of the previous year in
    // any timezone behind UTC — so Winter issues would file under the wrong year.
    const issues = (data.issues || []).slice()
      .sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });

    const qInput = $('[data-newsletter-search]');
    const counter = $('[data-newsletter-count]');
    const searchable = issues.filter(function (i) { return i.text && i.text.length > 200; }).length;

    const note = $('[data-newsletter-note]');
    if (note) {
      const years = issues.map(function (i) { return parseDate(i.date).getFullYear(); });
      const span = issues.length ? Math.min.apply(null, years) + '–' + Math.max.apply(null, years) : '';
      note.textContent = searchable === issues.length
        ? `All ${issues.length} issues (${span}) can be searched inside.`
        : `${issues.length} issues listed, ${span}. ${searchable} can be searched inside so far — `
          + `the rest open as PDFs and will become searchable once they have been indexed.`;
    }

    function snippetFor(issue, q) {
      if (!q || !issue.text) return '';
      const at = issue.text.toLowerCase().indexOf(q);
      if (at === -1) return '';
      let start = Math.max(0, at - 90);
      let end = Math.min(issue.text.length, at + 170);
      if (start > 0) start = issue.text.indexOf(' ', start) + 1;
      if (end < issue.text.length) end = issue.text.lastIndexOf(' ', end);
      const raw = issue.text.slice(start, end).trim();
      const safe = esc(raw).replace(
        new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
      return '<p class="hit">…' + safe + '…</p>';
    }

    const SEASON_ORDER = { Winter: 0, Spring: 1, Summer: 2, Fall: 3, Autumn: 3 };

    function seasonOf(issue) {
      const m = (issue.title || '').match(/winter|spring|summer|fall|autumn/i);
      return m ? m[0][0].toUpperCase() + m[0].slice(1).toLowerCase() : '';
    }

    function issueRow(i, q) {
      const d = parseDate(i.date);
      const season = seasonOf(i);
      const year = d.getFullYear();

      const meta = [
        MONTHS_LONG[d.getMonth()] + ' ' + year,
        i.volume,
        i.pages ? i.pages + ' pages' : '',
        i.words ? i.words.toLocaleString() + ' words' : ''
      ].filter(Boolean).join(' · ');

      const indexed = i.text && i.text.length > 200;
      const badge = indexed
        ? '<span class="tag tag--on">Searchable</span>'
        : '<span class="tag">Not yet indexed</span>';

      const bullets = (i.highlights || []).length
        ? '<ul class="issue-topics">' +
            i.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') +
          '</ul>'
        : (indexed
            ? '<p class="issue-lede">' + esc(i.text.slice(0, 200).replace(/\s+\S*$/, '')) + '…</p>'
            : '<p class="issue-lede issue-lede--muted">Contents not yet listed. ' +
              'Open the PDF to read this issue.</p>');

      return '<article class="issue">' +
        '<div class="issue-when">' +
          '<span class="season">' + esc(season || 'Issue') + '</span>' +
          '<span class="year">' + year + '</span>' +
        '</div>' +
        '<div class="issue-body">' +
          '<h3><a href="' + esc(i.url) + '" target="_blank" rel="noopener">' +
            esc(i.title) + '</a></h3>' +
          (meta ? '<p class="issue-meta">' + esc(meta) + '</p>' : '') +
          (q ? snippetFor(i, q) : bullets) +
        '</div>' +
        '<div class="issue-actions">' +
          badge +
          '<a class="btn btn--ghost" href="' + esc(i.url) + '" target="_blank" rel="noopener">Read PDF</a>' +
        '</div>' +
      '</article>';
    }

    function render() {
      const q = (qInput && qInput.value.trim().toLowerCase()) || '';
      const shown = issues.filter(function (i) {
        if (!q) return true;
        return (i.title + ' ' + (i.text || '') + ' ' + (i.highlights || []).join(' '))
          .toLowerCase().indexOf(q) > -1;
      });

      if (!shown.length) {
        mount.innerHTML = '<div class="empty-state">' +
          '<p>No indexed issue mentions that.</p>' +
          '<p>Only issues that have been through the newsletter indexer can be ' +
          'searched inside. Clear the search box to see the full list.</p></div>';
      } else {
        // Group into years, newest year first, and newest issue first within a year.
        const years = [];
        const byYear = {};
        shown.forEach(function (i) {
          const y = parseDate(i.date).getFullYear();
          if (!byYear[y]) { byYear[y] = []; years.push(y); }
          byYear[y].push(i);
        });
        years.sort(function (a, b) { return b - a; });

        mount.innerHTML = years.map(function (y) {
          const list = byYear[y].sort(function (a, b) {
            return (SEASON_ORDER[seasonOf(b)] ?? 0) - (SEASON_ORDER[seasonOf(a)] ?? 0);
          });
          return '<section class="issue-year">' +
            '<h3 class="issue-year-head">' + y +
              '<span>' + list.length + ' issue' + (list.length === 1 ? '' : 's') + '</span>' +
            '</h3>' +
            list.map(function (i) { return issueRow(i, q); }).join('') +
          '</section>';
        }).join('');
      }

      if (counter) {
        counter.textContent = q
          ? shown.length + ' of ' + issues.length + ' issues mention “' + qInput.value.trim() + '”'
          : issues.length + ' issues, newest first';
      }
    }

    if (qInput) qInput.addEventListener('input', render);
    render();
  })();

  /* ====================================================================
     8. Historical directories
     --------------------------------------------------------------------
     Search of the city directories, 1870–1968. The index is a few megabytes,
     so it is only fetched on this page.
     ==================================================================== */

  (async function initDirectories() {
    const results = $('[data-dir-results]');
    if (!results) return;

    const status = $('[data-dir-status]');
    const KIND = { B: 'Business', R: 'Residence', '': 'Unlisted' };
    const MAX_ROWS = 800, MAX_GROUPS = 400;

    // Fold accents, drop punctuation — so "O'Brien" and "OBrien" both match.
    const norm = function (s) {
      return (s || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    };
    const toks = function (s) { return norm(s).split(' ').filter(Boolean); };

    /* ---- link from a listing to the scanned volume ----------------------
       The identifier scheme has to match tools/build_pdf_section.py, which
       generates the scan list on the other tab: mountain-view-city-directory-YYYY.

       The trailing /search/<term> is the BookReader's own deep-link syntax, so
       once the Internet Archive has finished its OCR the book should open with
       that term already searched. UNVERIFIED -- archive.org has nothing on it
       yet, and OCR runs after upload, so check this on the first volume that
       goes up. Dropping the /search/ segment still opens the book at page one,
       which is the worst case.

       The search term is the name up to the comma: a surname for a person,
       the whole thing for a business. Deliberately loose -- these scans OCR
       imperfectly, and a surname has a far better chance of matching than a
       full name with initials. */
    function scanUrl(e) {
      const id = 'mountain-view-city-directory-' + e.y;
      const term = String(e.n || '').split(',')[0].trim();
      return 'https://archive.org/details/' + id +
        (term ? '/search/' + encodeURIComponent(term) : '');
    }

    function mark(text, terms) {
      let out = esc(text || '');
      terms.forEach(function (t) {
        if (t.length < 2) return;
        out = out.replace(
          new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
      });
      return out;
    }

    let DATA = [], YEARS = [];
    // Filter modes are exclusive; 'all' is the default and hides nothing.
    // The two address modes deliberately require a real address, which is what
    // leaves out the pre-1926 volumes - those simply never printed one.
    const MODES = [
      { k: 'all',     label: 'Show all',                  test: function () { return true; } },
      { k: 'bizaddr', label: 'Businesses with addresses',  test: function (e) { return e.k === 'B' && !!e.a; } },
      { k: 'resaddr', label: 'Residences with addresses',  test: function (e) { return e.k === 'R' && !!e.a; } }
    ];
    let mode = 'all';
    function modeTest() {
      const m = MODES.filter(function (x) { return x.k === mode; })[0] || MODES[0];
      return m.test;
    }

    const els = {
      q: $('[data-dir-q]'), name: $('[data-dir-name]'), street: $('[data-dir-street]'),
      occ: $('[data-dir-occ]'), from: $('[data-dir-from]'), to: $('[data-dir-to]'),
      group: $('[data-dir-group]'), chips: $('[data-dir-kinds]'), meta: $('[data-dir-meta]')
    };

    try {
      // 'force-cache' hands a returning visitor whatever copy their browser
      // already has, for as long as it chooses to keep it -- so a rebuilt
      // index never reaches them. 'no-cache' still uses the cached copy, but
      // asks the server first whether it is stale.
      const res = await fetch(BASE + 'data/directory_index.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const raw = await res.json();

      YEARS = raw.years;
      DATA = raw.entries.map(function (e) {
        return {
          n: e[0], o: e[1], a: e[2], k: e[3], y: e[4],
          _n: norm(e[0]), _o: norm(e[1]), _a: norm(e[2]),
          _nc: norm(e[0]).replace(/ /g, '')
        };
      });

      if (els.meta) {
        els.meta.textContent = raw.count.toLocaleString() + ' entries across ' +
          YEARS.length + ' directory years.';
      }
    } catch (err) {
      status.innerHTML = 'The directory index could not be loaded. ' +
        'If you are viewing this site from a folder on your computer, start a local ' +
        'web server first (see README.md). <span style="color:var(--ink-faint)">(' +
        esc(err.message) + ')</span>';
      results.innerHTML = '';
      return;
    }

    // ---- Filters ----

    els.chips.innerHTML = MODES.map(function (m) {
      return '<button type="button" class="chip" data-kind="' + m.k + '" aria-pressed="' +
        (m.k === mode) + '">' + m.label + '</button>';
    }).join('');

    els.chips.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-kind]');
      if (!btn) return;
      mode = btn.dataset.kind;
      $$('[data-kind]', els.chips).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.kind === mode));
      });
      run();
    });

    const yearOptions = YEARS.map(function (y) { return '<option>' + y + '</option>'; }).join('');
    els.from.innerHTML = yearOptions;
    els.to.innerHTML = yearOptions;
    els.from.value = YEARS[0];
    els.to.value = YEARS[YEARS.length - 1];

    // ---- Matching ----

    function everyTermIn(hay, terms) {
      for (let i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return false;
      return true;
    }

    // Reward matches at the start of a name over matches buried mid-word.
    function nameScore(e, terms) {
      let s = 0;
      for (let i = 0; i < terms.length; i++) {
        const t = terms[i];
        if (e._n.indexOf(t) === 0) s += 10;
        else if ((' ' + e._n).indexOf(' ' + t) !== -1) s += 8;
        else if (e._n.indexOf(t) !== -1 || e._nc.indexOf(t) !== -1) s += 5;
        else return -1;
      }
      return s;
    }

    function rowsFor(hits, hlName, hlOcc, hlAddr) {
      return hits.map(function (h) {
        const e = h[1];
        return '<tr>' +
          '<td class="dir-year">' + e.y + '</td>' +
          '<td class="dir-name">' + mark(e.n, hlName) + '</td>' +
          '<td class="dir-occ">' + mark(e.o, hlOcc) + '</td>' +
          '<td class="dir-addr">' + mark(e.a, hlAddr) + '</td>' +
          '<td class="dir-kind">' + (e.k ? '<span class="tag tag--' + e.k + '">' + KIND[e.k] + '</span>' : '') + '</td>' +
          '<td class="dir-scan"><a class="scanlink" href="' + scanUrl(e) + '" target="_blank" rel="noopener" ' +
            'title="Open the ' + e.y + ' directory scan at this entry">View PDF</a></td>' +
        '</tr>';
      }).join('');
    }

    function run() {
      const any = toks(els.q.value);
      const name = toks(els.name.value);
      const street = toks(els.street.value);
      const occ = toks(els.occ.value);

      const lo = Math.min(YEARS.indexOf(els.from.value), YEARS.indexOf(els.to.value));
      const hi = Math.max(YEARS.indexOf(els.from.value), YEARS.indexOf(els.to.value));
      const yLo = +YEARS[lo], yHi = +YEARS[hi];

      const searching = any.length || name.length || street.length || occ.length;
      const narrowed = searching || mode !== 'all' || lo > 0 || hi < YEARS.length - 1;
      const passes = modeTest();

      // Flag the address note when an address-only limit is on and the chosen
      // range reaches back into the years that have no addresses to give.
      const addrNote = $('[data-dir-addrnote]');
      if (addrNote) {
        addrNote.classList.toggle('callout--warn', mode !== 'all' && +YEARS[lo] < 1926);
      }

      // The advanced filters are folded away by default, so say when some are
      // in use -- otherwise a stray year range or name filter is invisible and
      // the result count looks wrong for no apparent reason.
      const advBtn = $('[data-collapse-toggle="dirfilters"]');
      if (advBtn) {
        let n = 0;
        if (els.name && els.name.value.trim()) n++;
        if (els.street && els.street.value.trim()) n++;
        if (els.occ && els.occ.value.trim()) n++;
        if (lo > 0 || hi < YEARS.length - 1) n++;
        const lbl = $('[data-collapse-label]', advBtn);
        const base = advBtn.getAttribute('aria-expanded') === 'true'
          ? 'Fewer filters' : 'More filters';
        if (lbl) lbl.textContent = n ? base + ' \u00b7 ' + n + ' on' : base;
        advBtn.classList.toggle('is-active', n > 0);
      }

      const hlName = any.concat(name);
      const hlOcc = any.concat(occ);
      const hlAddr = any.concat(street);

      const hits = [];
      for (let i = 0; i < DATA.length; i++) {
        const e = DATA[i];
        if (!passes(e)) continue;
        if (e.y < yLo || e.y > yHi) continue;
        if (name.length && nameScore(e, name) < 0) continue;
        if (street.length && !everyTermIn(e._a, street)) continue;
        if (occ.length && !everyTermIn(e._o, occ)) continue;
        if (any.length && !everyTermIn(e._n + ' ' + e._o + ' ' + e._a, any)) continue;

        let score = 0;
        if (name.length) score += nameScore(e, name);
        if (any.length) { const q = nameScore(e, any); score += (q < 0 ? 2 : q); }
        hits.push([score, e]);
      }

      if (!narrowed) {
        status.textContent = DATA.length.toLocaleString() +
          ' entries — search above, or set a filter, to begin.';
        results.innerHTML = '<div class="empty-state"><p>Search ' +
          DATA.length.toLocaleString() + ' directory entries by name, occupation or address.</p></div>';
        return;
      }

      const total = hits.length;
      status.textContent = total === 0 ? 'No matches.'
        : total.toLocaleString() + ' matching ' + (total === 1 ? 'entry' : 'entries');

      if (!total) {
        results.innerHTML = '<div class="empty-state"><p>No matches. Try fewer or different words, ' +
          'or widen the year range.</p></div>';
        return;
      }

      hits.sort(function (a, b) {
        return b[0] - a[0] || a[1].y - b[1].y || a[1]._n.localeCompare(b[1]._n);
      });

      if (!els.group.checked) {
        const shown = hits.slice(0, MAX_ROWS);
        results.innerHTML =
          '<div class="dir-table"><table><tbody>' + rowsFor(shown, hlName, hlOcc, hlAddr) +
          '</tbody></table></div>' +
          (total > MAX_ROWS
            ? '<p class="more">Showing the first ' + MAX_ROWS + ' of ' + total.toLocaleString() +
              ' — narrow your search to see the rest.</p>' : '');
        return;
      }

      // Group listings for the same person or business together.
      const groups = new Map();
      hits.forEach(function (h) {
        const key = h[1]._n;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(h);
      });

      const all = Array.from(groups.values()).sort(function (a, b) {
        return b[0][0] - a[0][0] || b.length - a.length;
      });

      const html = all.slice(0, MAX_GROUPS).map(function (g) {
        g.sort(function (a, b) { return a[1].y - b[1].y; });
        const years = g.map(function (x) { return x[1].y; });
        const first = Math.min.apply(null, years), last = Math.max.apply(null, years);
        const span = first === last ? String(first) : first + '–' + last;
        const addrs = Array.from(new Set(g.map(function (x) { return x[1].a; })
          .filter(Boolean))).slice(0, 3);

        return '<section class="dir-group">' +
          '<h3>' + mark(g[0][1].n, hlName) + '</h3>' +
          '<p class="dir-group-meta">' + g.length + ' listing' + (g.length === 1 ? '' : 's') +
            ' · ' + span + (addrs.length ? ' · ' + addrs.map(esc).join(' · ') : '') + '</p>' +
          '<div class="dir-table"><table><tbody>' + rowsFor(g, hlName, hlOcc, hlAddr) +
          '</tbody></table></div>' +
        '</section>';
      }).join('');

      results.innerHTML = html + (all.length > MAX_GROUPS
        ? '<p class="more">Showing the first ' + MAX_GROUPS + ' of ' + all.length.toLocaleString() +
          ' names — narrow your search to see the rest.</p>' : '');
    }

    // ---- Wiring ----

    let timer = null;
    const debounced = function () { clearTimeout(timer); timer = setTimeout(run, 140); };
    [els.q, els.name, els.street, els.occ].forEach(function (el) {
      el.addEventListener('input', debounced);
    });
    [els.from, els.to, els.group].forEach(function (el) {
      el.addEventListener('change', run);
    });

    $$('[data-dir-example]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        els.q.value = btn.dataset.dirExample;
        run();
        els.q.focus();
      });
    });

    // Folding the advanced filters open or shut changes the toggle's own label,
    // so re-run to put the "N on" counter back on it.
    document.addEventListener('collapse:toggled', function () { run(); });

    const clear = $('[data-dir-clear]');
    if (clear) {
      clear.addEventListener('click', function () {
        [els.q, els.name, els.street, els.occ].forEach(function (el) { el.value = ''; });
        els.from.value = YEARS[0];
        els.to.value = YEARS[YEARS.length - 1];
        mode = 'all';
        $$('[data-kind]', els.chips).forEach(function (c) {
          c.setAttribute('aria-pressed', String(c.dataset.kind === 'all'));
        });
        const adv = document.getElementById('dirfilters');
        const advBtn = $('[data-collapse-toggle="dirfilters"]');
        if (adv && advBtn) {
          adv.hidden = true;
          advBtn.setAttribute('aria-expanded', 'false');
          advBtn.textContent = 'More filters';
        }
        run();
        els.q.focus();
      });
    }

    // Allow linking straight to a search: directories.html?q=rengstorff
    const preset = new URLSearchParams(window.location.search).get('q');
    if (preset) els.q.value = preset;

    run();

    /* ==================================================================
       Criss-cross — one street, one year, in house-number order
       ------------------------------------------------------------------
       The alphabetical list answers "where did this person live?". This
       answers the other question a directory gets asked: "who lived along
       this street?" -- which is what the printed criss-cross sections were
       for, and what the alphabetical view cannot show.

       Only entries whose address begins with a house number can appear.
       That is 135,894 of 188,268, strong from 1926 on and in 1914, and
       almost nothing before that -- those volumes printed no addresses at
       all. The year list below is built from the data, so a year with no
       numbered addresses simply is not offered.
       ================================================================== */
    (function initCrissCross() {
      const xResults = $('[data-x-results]');
      if (!xResults) return;
      const xStreet = $('[data-x-street]'),
            xYear   = $('[data-x-year]'),
            xSides  = $('[data-x-sides]'),
            xStatus = $('[data-x-status]');

      // Odd and even numbers face each other across a street, so looking at one
      // side at a time is how you actually read a block. 'both' is the default.
      let side = 'both';

      // "1074 Marilyn Drive" -> 1074 + "Marilyn Drive"; "128a Castro" -> 128 A.
      // The optional fraction matters: without it "340 1/2 Castro" parses as
      // number 340 on a street called "1/2 Castro", which then files separately
      // from Castro itself.
      const HOUSE = /^(\d+)\s*(1\/2|½|1\/4|3\/4)?\s*([a-zA-Z])?\s+(.+)$/;
      // Trailing unit markers, pulled off so "Castro apt 5" files under Castro.
      // Room numbers count as units too: 655 Castro was an office building and
      // its listings run "655 Castro R1" to "R8", plus "655 Castro Rm 5".
      const UNIT = /\s+(apt\.?\s*[\w-]+|#\s*[\w-]+|rms?\.?\s*\d+[a-z]?|r\s?\d+[a-z]?|rear|upstairs|upper|lower)$/i;
      const MAX_X = 1200;

      const xRows = [];
      DATA.forEach(function (e) {
        const m = HOUSE.exec((e.a || '').trim());
        if (!m) return;
        let street = m[4].trim(), unit = m[2] ? m[2].replace('1/2', '\u00bd') : '';
        const u = UNIT.exec(street);
        if (u) {
          unit = (unit ? unit + ' ' : '') + u[1].trim();
          street = street.slice(0, u.index).trim();
        }
        if (!street) return;
        xRows.push({ e: e, n: parseInt(m[1], 10), sfx: (m[3] || '').toUpperCase(),
                     street: street, key: norm(street), unit: unit });
      });

      const xYears = [];
      const seenY = {};
      xRows.forEach(function (r) {
        if (!seenY[r.e.y]) { seenY[r.e.y] = 1; xYears.push(r.e.y); }
      });
      xYears.sort(function (a, b) { return b - a; });          // newest first
      xYear.innerHTML = xYears.map(function (y) {
        return '<option>' + y + '</option>';
      }).join('');

      const SIDES = [
        { k: 'both', label: 'Both sides' },
        { k: 'odd',  label: 'Odd' },
        { k: 'even', label: 'Even' }
      ];
      if (xSides) {
        xSides.innerHTML = SIDES.map(function (s) {
          return '<button type="button" class="chip" data-side="' + s.k +
            '" aria-pressed="' + (s.k === side) + '">' + s.label + '</button>';
        }).join('');
        xSides.addEventListener('click', function (ev) {
          const btn = ev.target.closest('[data-side]');
          if (!btn) return;
          side = btn.dataset.side;
          $$('[data-side]', xSides).forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.dataset.side === side));
          });
          drawCross();
        });
      }

      function drawCross() {
        const year = +xYear.value;
        const terms = toks(xStreet.value);
        const hits = xRows.filter(function (r) {
          if (r.e.y !== year) return false;
          if (side === 'odd' && r.n % 2 === 0) return false;
          if (side === 'even' && r.n % 2 !== 0) return false;
          for (let i = 0; i < terms.length; i++) {
            if (r.key.indexOf(terms[i]) < 0) return false;
          }
          return true;
        });

        if (!hits.length) {
          const anyThisYear = xRows.some(function (r) { return r.e.y === year; });
          const anyBothSides = side !== 'both' && xRows.some(function (r) {
            if (r.e.y !== year) return false;
            for (let i = 0; i < terms.length; i++) {
              if (r.key.indexOf(terms[i]) < 0) return false;
            }
            return true;
          });
          xStatus.textContent = !anyThisYear
            ? 'The ' + year + ' directory prints no street numbers, so there is ' +
              'nothing to walk down. Try 1914, or 1926 onwards.'
            : anyBothSides
              ? 'Nothing on the ' + side + '-numbered side. There are listings on the ' +
                'other side — try Both sides.'
              : 'No street matches that in ' + year + '.';
          xResults.innerHTML = '';
          return;
        }

        // Group by street, then walk up the numbers.
        const byStreet = {};
        hits.forEach(function (r) {
          (byStreet[r.key] = byStreet[r.key] || { name: r.street, rows: [] }).rows.push(r);
        });
        const groups = Object.keys(byStreet).sort().map(function (k) { return byStreet[k]; });
        groups.forEach(function (g) {
          g.rows.sort(function (a, b) {
            return a.n - b.n || a.sfx.localeCompare(b.sfx) || a.e.n.localeCompare(b.e.n);
          });
        });

        xStatus.textContent = hits.length.toLocaleString() + ' listing' +
          (hits.length === 1 ? '' : 's') +
          (side === 'both' ? '' : ' on the ' + side + '-numbered side') +
          ' on ' + groups.length + ' street' + (groups.length === 1 ? '' : 's') +
          ' in ' + year;

        let shown = 0;
        const html = groups.map(function (g) {
          if (shown >= MAX_X) return '';
          const take = g.rows.slice(0, MAX_X - shown);
          shown += take.length;
          return '<section class="dir-group">' +
            '<h3 class="x-street">' + esc(g.name.toUpperCase()) + '</h3>' +
            '<p class="dir-group-meta">' + g.rows.length + ' listing' +
              (g.rows.length === 1 ? '' : 's') + ' &middot; ' + year + '</p>' +
            '<div class="dir-table"><table><tbody>' +
            take.map(function (r) {
              return '<tr>' +
                '<td class="x-num">' + r.n + esc(r.sfx.toLowerCase()) +
                  (r.unit ? ' <span class="x-unit">' + esc(r.unit) + '</span>' : '') + '</td>' +
                '<td class="dir-name">' + esc(r.e.n) + '</td>' +
                '<td class="dir-occ">' + esc(r.e.o) + '</td>' +
                '<td class="dir-kind">' + (r.e.k
                  ? '<span class="tag tag--' + r.e.k + '">' + KIND[r.e.k] + '</span>' : '') + '</td>' +
                '<td class="dir-scan"><a class="scanlink" href="' + scanUrl(r.e) +
                  '" target="_blank" rel="noopener">View PDF</a></td>' +
              '</tr>';
            }).join('') +
            '</tbody></table></div></section>';
        }).join('');

        xResults.innerHTML = html + (shown < hits.length
          ? '<p class="more">Showing the first ' + shown.toLocaleString() + ' of ' +
            hits.length.toLocaleString() + ' — name a street to narrow it down.</p>' : '');
      }

      let xTimer = null;
      xStreet.addEventListener('input', function () {
        clearTimeout(xTimer);
        xTimer = setTimeout(drawCross, 140);
      });
      xYear.addEventListener('change', drawCross);
      $$('[data-x-example]').forEach(function (b) {
        b.addEventListener('click', function () {
          xStreet.value = b.dataset.xExample;
          drawCross();
        });
      });

      drawCross();
    })();
  })();

  /* ====================================================================
     9. Site search
     ==================================================================== */

  (async function initSearch() {
    const results = $('[data-search-results]');
    if (!results) return;

    const input = $('[data-search-input]');
    const summary = $('[data-search-summary]');

    const [pagesData, photosData, timelineData, newsData, postsData] = await Promise.all([
      loadData('pages'), loadData('photos'), loadData('timeline'), loadData('newsletters'),
      loadData('posts')
    ]);

    /* The Internet Archive catalogue is fetched separately and folded in with
       the Association's own photographs below, so that a search for a family
       name or a street reaches all thirteen hundred of them. */
    const archiveData = await loadData('photos-ia');

    /* The newsletters' text lives in its own file; join it on before indexing,
       or a search for a name inside a PDF would find nothing. */
    joinNewsletterText(newsData, await loadData('newsletter-text'));

    // Build one flat index across pages, photographs and timeline milestones.
    const index = [];

    if (pagesData) {
      (pagesData.pages || []).forEach(function (p) {
        index.push({
          kind: 'Page', title: p.title, url: BASE + p.url,
          snippet: p.summary, haystack: (p.title + ' ' + p.summary + ' ' + p.body).toLowerCase()
        });
      });
    }
    function indexPhotos(list) {
      (list || []).forEach(function (p) {
        index.push({
          kind: 'Photograph', title: p.title, url: BASE + 'archive.html?photo=' + encodeURIComponent(p.id),
          snippet: [p.date, p.caption].filter(Boolean).join(' — '),
          haystack: (p.title + ' ' + (p.caption || '') + ' ' + (p.date || '') + ' ' + p.topic).toLowerCase()
        });
      });
    }
    if (photosData) indexPhotos(photosData.photos);
    if (archiveData) indexPhotos(archiveData.photos);
    if (postsData) {
      (postsData.posts || []).forEach(function (p) {
        index.push({
          kind: 'News', title: p.title, url: BASE + p.url,
          fullText: p.text || '',
          snippet: p.summary,
          haystack: (p.title + ' ' + p.summary + ' ' + (p.text || '')).toLowerCase()
        });
      });
    }
    if (timelineData) {
      (timelineData.entries || []).forEach(function (t) {
        index.push({
          kind: 'Timeline', title: t.year + ' — ' + t.title, url: BASE + 'timeline.html',
          snippet: t.text, haystack: (t.year + ' ' + t.title + ' ' + t.text).toLowerCase()
        });
      });
    }
    if (newsData) {
      (newsData.issues || []).forEach(function (n) {
        var body = (n.text || '') + ' ' + (n.highlights || []).join(' ');
        index.push({
          kind: 'Newsletter',
          title: 'The Mountain ReView — ' + n.title,
          url: n.url,
          external: true,
          fullText: n.text || '',
          snippet: (n.highlights || []).slice(0, 2).join(' · ') ||
                   (n.text ? n.text.slice(0, 180) + '…' : 'Read this issue as a PDF.'),
          haystack: ('mountain review newsletter ' + n.title + ' ' + body).toLowerCase()
        });
      });
    }

    /** Pull a readable snippet out of a long document, centred on the match. */
    function contextSnippet(fullText, terms) {
      if (!fullText) return '';
      var lower = fullText.toLowerCase();
      var at = -1;
      for (var i = 0; i < terms.length; i++) {
        at = lower.indexOf(terms[i]);
        if (at > -1) break;
      }
      if (at === -1) return '';
      var start = Math.max(0, at - 110);
      var end = Math.min(fullText.length, at + 190);
      // Snap to word boundaries so we don't cut words in half.
      if (start > 0) start = fullText.indexOf(' ', start) + 1;
      if (end < fullText.length) end = fullText.lastIndexOf(' ', end);
      return (start > 0 ? '…' : '') + fullText.slice(start, end).trim() + (end < fullText.length ? '…' : '');
    }

    function highlight(text, terms) {
      let out = esc(text);
      terms.forEach(function (t) {
        if (t.length < 2) return;
        out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
      });
      return out;
    }

    /* ---- Source filters: Website / Photos / Timeline / Newsletters ---- */

    const SOURCES = [
      { kind: 'Page', label: 'Website pages' },
      { kind: 'News', label: 'News & stories' },
      { kind: 'Photograph', label: 'Photo archive' },
      { kind: 'Timeline', label: 'City timeline' },
      { kind: 'Newsletter', label: 'Newsletters' }
    ].filter(function (s) {
      return index.some(function (i) { return i.kind === s.kind; });
    });

    const panel = $('[data-search-sources]');
    let active = new Set(SOURCES.map(function (s) { return s.kind; }));

    if (panel && SOURCES.length > 1) {
      panel.hidden = false;
      $('.source-list', panel).innerHTML = SOURCES.map(function (s) {
        const n = index.filter(function (i) { return i.kind === s.kind; }).length;
        return '<label class="source"><input type="checkbox" checked value="' + esc(s.kind) + '"> ' +
          '<span>' + esc(s.label) + '</span>' +
          '<span class="source-count" data-count-for="' + esc(s.kind) + '">' + n.toLocaleString() + '</span>' +
        '</label>';
      }).join('');

      panel.addEventListener('change', function () {
        active = new Set($$('input:checked', panel).map(function (i) { return i.value; }));
        // Never leave every box unticked — that can only ever show nothing.
        if (!active.size) {
          $$('input', panel).forEach(function (i) { i.checked = true; });
          active = new Set(SOURCES.map(function (s) { return s.kind; }));
        }
        run(input ? input.value : '');
      });
    }

    function run(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        results.innerHTML = '';
        $$('[data-count-for]').forEach(function (el) {
          const n = index.filter(function (i) { return i.kind === el.dataset.countFor; }).length;
          el.textContent = n.toLocaleString();
        });
        if (summary) summary.textContent = 'Type a word or phrase above — try “Castro”, “Adobe Building”, “1902” or “orchard”.';
        return;
      }

      const terms = q.split(/\s+/).filter(Boolean);

      // Score everything first, so the per-source counts stay honest even for
      // sources the visitor has switched off.
      const scored = index.map(function (item) {
        let score = 0;
        terms.forEach(function (t) {
          if (item.title.toLowerCase().indexOf(t) !== -1) score += 5;
          const matches = item.haystack.split(t).length - 1;
          score += Math.min(matches, 4);
        });
        // Require every term to appear somewhere.
        const all = terms.every(function (t) { return item.haystack.indexOf(t) !== -1; });
        return all && score > 0 ? { item: item, score: score } : null;
      }).filter(Boolean);

      $$('[data-count-for]').forEach(function (el) {
        const n = scored.filter(function (h) { return h.item.kind === el.dataset.countFor; }).length;
        el.textContent = n.toLocaleString();
        el.closest('.source').classList.toggle('is-empty', n === 0);
      });

      const hits = scored
        .filter(function (h) { return active.has(h.item.kind); })
        .sort(function (a, b) { return b.score - a.score; });

      if (summary) {
        const hidden = scored.length - hits.length;
        if (hits.length) {
          summary.textContent = hits.length + ' result' + (hits.length === 1 ? '' : 's') +
            ' for “' + query.trim() + '”' +
            (hidden ? ' · ' + hidden + ' more in sources you have switched off' : '');
        } else if (scored.length) {
          summary.textContent = 'No results in the sources you have selected. ' +
            scored.length + ' match' + (scored.length === 1 ? '' : 'es') + ' elsewhere — tick more boxes above.';
        } else {
          summary.textContent = 'No results for “' + query.trim() + '”. Try a broader word, ' +
            'or search the Historical Directories for a person or address.';
        }
      }

      const LIMIT = 60;
      results.innerHTML = hits.slice(0, LIMIT).map(function (h) {
        var it = h.item;
        var snippet = contextSnippet(it.fullText, terms) || it.snippet || '';
        var attrs = it.external ? ' target="_blank" rel="noopener"' : '';
        var suffix = it.external ? ' <span class="ext">(PDF)</span>' : '';
        return '<li>' +
          '<span class="kind">' + esc(it.kind) + '</span>' +
          '<h3><a href="' + esc(it.url) + '"' + attrs + '>' + highlight(it.title, terms) + '</a>' + suffix + '</h3>' +
          '<p>' + highlight(snippet, terms) + '</p>' +
        '</li>';
      }).join('') + (hits.length > LIMIT
        ? '<li class="more-results">Showing the best ' + LIMIT + ' of ' + hits.length +
          ' matches — add another word to narrow it down.</li>'
        : '');
    }

    // Run on load if there's a ?q= in the address, and live as you type.
    const initial = new URLSearchParams(window.location.search).get('q') || '';
    if (input) {
      input.value = initial;
      input.addEventListener('input', function () { run(input.value); });
      input.focus();
    }
    run(initial);
  })();

  /* ====================================================================
     9b. Tabs and collapsible panels
     --------------------------------------------------------------------
     Used by the directories page: "Directory search" / "Browse the scans",
     and the "More filters" disclosure. Both are generic and driven by data
     attributes, so any page can use them.

     The scans tab answers to #scans in the address bar, which is what the
     old in-page anchor used, so existing links keep working.
     ==================================================================== */

  (function initTabs() {
    const bar = $('[data-tabs]');
    if (!bar) return;
    const tabs = $$('[data-tab]', bar);
    const panels = $$('[data-panel]');

    function show(name, remember) {
      tabs.forEach(function (b) {
        b.setAttribute('aria-selected', String(b.dataset.tab === name));
      });
      panels.forEach(function (p) { p.hidden = p.dataset.panel !== name; });
      if (remember && window.history && history.replaceState) {
        history.replaceState(null, '', name === 'search'
          ? location.pathname + location.search
          : '#' + name);
      }
    }

    bar.addEventListener('click', function (e) {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      show(b.dataset.tab, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Links elsewhere on the page that should switch tab rather than jump.
    document.addEventListener('click', function (e) {
      const l = e.target.closest('[data-tab-link]');
      if (!l) return;
      e.preventDefault();
      show(l.dataset.tabLink, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function fromHash(remember) {
      show(location.hash === '#scans' ? 'scans' : 'search', remember);
    }
    // A link to #scans from another page, or the back button, should land on
    // the right tab -- a fragment change does not reload the page.
    window.addEventListener('hashchange', function () { fromHash(false); });
    fromHash(false);
  })();

  (function initCollapse() {
    $$('[data-collapse-toggle]').forEach(function (btn) {
      const panel = document.getElementById(btn.getAttribute('data-collapse-toggle'));
      if (!panel) return;
      const label = $('[data-collapse-label]', btn) || btn;
      const opened = btn.dataset.labelOpen || 'Fewer filters';
      const closed = btn.dataset.labelClosed || label.textContent.trim();
      btn.addEventListener('click', function () {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        btn.setAttribute('aria-expanded', String(willOpen));
        label.textContent = willOpen ? opened : closed;
        btn.dispatchEvent(new CustomEvent('collapse:toggled', { bubbles: true }));
      });
    });
  })();

  /* ====================================================================
     10. Footer year
     ==================================================================== */

  $$('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* -------------------------------------------------------------------- */

  function fallbackMessage() {
    return '<div class="empty-state"><p><strong>Content could not be loaded.</strong></p>' +
      '<p>If you are viewing this site from a folder on your computer, start a local web server first ' +
      '(see README.md). Once the site is published to a web host this message will not appear.</p></div>';
  }

})();
