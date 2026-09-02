#!/usr/bin/env node
/* ==========================================================================
   Internet Archive photographs -> data/photos-ia.json
   --------------------------------------------------------------------------
   The Mountain View History Center's photographs were digitised through
   California Revealed and are held permanently on the Internet Archive, in
   two collections:

     mountainviewlibrary                     City of Mountain View Public Library
     mountain-view-historical-association    our own collection

   The website does not hold copies of any of them. It shows the Internet
   Archive's own thumbnail and links to the item page there, which is why no
   picture files were added to this folder and why nothing here has to be
   kept in step with the Archive.

   This script turns the catalogue export in ia-photos-source.csv into the
   file the Photographs page reads. Run it only when that CSV changes:

       node tools/ia/build-photos.js

   It writes data/photos-ia.json. Do not edit that file by hand -- edit the
   CSV, or the rules below, and run this again. Photographs added through the
   editing panel live in data/photos.json instead, which this never touches.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');
const SOURCE = path.join(HERE, 'ia-photos-source.csv');
const OUT = path.join(ROOT, 'data', 'photos-ia.json');

/* ---- Reading the CSV ----------------------------------------------------
   A very small parser: fields may be quoted, quotes are doubled inside a
   quoted field, and a quoted field may contain commas and line breaks. That
   is the whole of the format we need, so there is no library to install. */

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
    return o;
  });
}

/* ---- Which shelf does a picture belong on? ------------------------------
   The Internet Archive records carry almost no subject headings -- the
   library catalogued these by title and call number, not by topic. So the
   topic is worked out from the title, using the list below, in order: the
   first pattern that matches wins. It will not be right every time, but a
   visitor also has the search box, which looks at the whole title and
   description.

   To move a kind of picture to a different shelf, move its line. To add a
   shelf, add a line -- and add the same name to TOPICS below so the menu on
   the page lists it in a sensible order. */

const RULES = [
  ['Oral histories',        /^interview with\b|oral history/i],
  ['Schools & yearbooks',   /\bschool\b|blue and the gray|yearbook|graduat|classroom|kindergarten|\bpupils?\b|\bstudents?\b/i],
  ['Churches',              /\bchurch|chapel|presbyterian|methodist|baptist|catholic|congregation|seventh[- ]day|pacific press/i],
  ['Farms & orchards',      /\branch\b|orchard|\bfarm|cannery|packing|vineyard|\bcrop|harvest|apricot|prune|nursery|\bgrove\b|dairy|creamery/i],
  ['Fire, police & city',   /\bfire\b|fireman|firemen|fire department|\bpolice\b|city hall|civic cent|\blibrary\b|post office|city council|\bmayor\b|community cent|\bjail\b/i],
  ['Transport',             /railroad|railway|\btrain\b|\bdepot\b|\bstation\b|\bbus\b|streetcar|\bairport|moffett|u\.?s\.?s\.?|airship|hangar|dirigible|\bblimp\b|freeway|interchange|bicycle|automobile|\bgarage\b/i],
  ['Shops & businesses',    /\bstore\b|\bshop\b|market|company|\bcorp|\bco\.\b|hotel|theat|restaurant|\bcaf|\bbank\b|barber|blacksmith|laundry|bakery|saloon|\bmall\b|plaza|factory|\bplant\b|\bmill\b|hardware|drug|stable|winery|service station/i],
  ['Castro Street & downtown', /castro street|\bdowntown\b|castro st\b/i],
  ['Streets & buildings',   /\bstreet\b|\bst\.\b|avenue|\bave\b|\broad\b|\brd\b|boulevard|\bblvd\b|\blane\b|\bln\b|\bway\b|intersection|downtown|\bblock\b|building|\bhall\b|aerial|looking (north|south|east|west)/i],
  ['Homes & families',      /\bhome\b|\bhouse\b|residence|\bfamily\b|\bfamilies\b/i],
  ['Events & parades',      /parade|celebration|festival|centennial|dedication|\bfair\b|picnic|\bpageant|carnival|reunion|wedding|funeral|groundbreaking|ribbon/i],
  ['Clubs & teams',         /\bclub\b|\bteam\b|baseball|football|basketball|\bband\b|\bscouts?\b|\blodge\b|\bi\.?o\.?o\.?f\.?\b|legion|\bgrange\b|chamber of commerce/i],
  ['Maps & documents',      /\bmap\b|\bplat\b|\bdeed\b|certificate|\bletter\b|\bposter\b|programme|program\b|newspaper|advertisement|postcard/i]
];

const FALLBACK = 'People & portraits';

const TOPICS = [
  'Castro Street & downtown',
  'Streets & buildings',
  'Homes & families',
  'Shops & businesses',
  'Schools & yearbooks',
  'Churches',
  'Farms & orchards',
  'Transport',
  'Fire, police & city',
  'Events & parades',
  'Clubs & teams',
  'Maps & documents',
  'People & portraits'
];

function topicFor(row) {
  const hay = [row.title, row.call_number].join(' ');
  for (const rule of RULES) if (rule[1].test(hay)) return rule[0];
  return FALLBACK;
}

/* ---- Dates --------------------------------------------------------------
   The catalogue stores an exact date for everything, but for most items only
   the year is really known and the rest is padded with 1 January. Showing
   "1 January 1906" for a photograph that is simply "1906" would be a small
   untruth repeated a thousand times, so a padded date is shown as the year
   alone. */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function displayDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  const y = m[1], mo = m[2], d = m[3];
  if (mo === '01' && d === '01') return y;
  if (d === '01') return MONTHS[Number(mo) - 1] + ' ' + y;
  return Number(d) + ' ' + MONTHS[Number(mo) - 1] + ' ' + y;
}

function decadeFor(iso) {
  const m = /^(\d{4})/.exec(iso || '');
  return m ? Math.floor(Number(m[1]) / 10) * 10 : null;
}

/* ---- Captions -----------------------------------------------------------
   California Revealed's descriptions are often a full paragraph naming
   everyone in the picture. The listing shows a trimmed version; the whole
   description is kept for the larger view and for the site search. */

function trim(text, n) {
  if (!text || text.length <= n) return text || '';
  const cut = text.slice(0, n);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return (stop > n * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…').trim();
}

/* ---- Build -------------------------------------------------------------- */

const rows = parseCsv(fs.readFileSync(SOURCE, 'utf8'));

const photos = [];
let oralHistories = 0;
const counts = {};

rows.forEach(function (row) {
  if (!row.identifier || !row.title) return;

  const topic = topicFor(row);

  /* Oral histories are recordings, not photographs. They would show up in the
     gallery as a row of identical grey placeholders, so they are counted here
     and the page points at them on the Internet Archive instead. */
  if (topic === 'Oral histories') { oralHistories++; return; }

  const id = row.identifier;
  const many = Number(row.files) > 1;

  /* Only what cannot be worked out from the identifier is stored. The three
     Internet Archive addresses -- thumbnail, full picture and item page --
     are all built from it in site.js, which keeps this file about a third of
     the size it would otherwise be. A file of this length is downloaded by
     every visitor who opens the Photographs page, so the saving is worth the
     small indirection. */
  const record = {
    id: id,
    title: row.title,
    date: displayDate(row.date),
    decade: decadeFor(row.date),
    topic: topic,
    caption: trim(row.description, 220),
    collection: row.holder,
    pd: /public domain/i.test(row.rights)
  };
  if (many) record.many = true;
  if (row.creator && row.creator !== 'Unknown') record.creator = row.creator;
  photos.push(record);

  counts[topic] = (counts[topic] || 0) + 1;
});

/* Dated pictures first, oldest to newest, so a visitor who arrives and scrolls
   sees the collection in order rather than a wall of undated items. */
photos.sort(function (a, b) {
  if ((a.decade === null) !== (b.decade === null)) return a.decade === null ? 1 : -1;
  if (a.decade !== b.decade) return (a.decade || 0) - (b.decade || 0);
  return a.title.localeCompare(b.title);
});

const out = {
  _comment: 'Generated by tools/ia/build-photos.js from tools/ia/ia-photos-source.csv. Do not edit by hand. Photographs added through the editing panel belong in photos.json instead.',
  generated: new Date().toISOString().slice(0, 10),
  oralHistories: oralHistories,
  collections: [
    { name: 'City of Mountain View Public Library', url: 'https://archive.org/details/mountainviewlibrary' },
    { name: 'Mountain View Historical Association', url: 'https://archive.org/details/mountain-view-historical-association' }
  ],
  topics: TOPICS.filter(function (t) { return counts[t]; }),
  photos: photos
};

/* Written without indentation: it is a generated file that nobody reads by
   hand, and the spaces alone would add a fifth to what visitors download. */
fs.writeFileSync(OUT, JSON.stringify(out) + '\n');

console.log('  ok  data/photos-ia.json');
console.log('      ' + photos.length + ' photographs, ' + oralHistories + ' oral histories left out');
TOPICS.forEach(function (t) { if (counts[t]) console.log('      ' + String(counts[t]).padStart(5) + '  ' + t); });
console.log('      ' + String(photos.filter(function (p) { return p.decade === null; }).length).padStart(5) + '  undated');
