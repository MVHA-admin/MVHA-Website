#!/usr/bin/env node
/* ==========================================================================
   MVHA site builder
   --------------------------------------------------------------------------
   Wraps each content fragment in tools/content/ with the shared header,
   navigation and footer, and writes finished .html files to the site root.

   Run it with:   node tools/build.js

   You only need to run this if you have edited the shared layout below, or a
   file in tools/content/. Day-to-day content (events, photos, timeline,
   board members) lives in /data as JSON and needs no rebuild at all.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(__dirname, 'content');

/* A test copy of the site should never turn up in Google above the real one.
   Build it with:  node tools/build.js --test-site   */
const TEST_SITE = process.argv.includes('--test-site');

/* Asset versions
   --------------------------------------------------------------------------
   A stylesheet keeps its address from one release to the next, so a browser
   that already has a copy will go on using it -- and a visitor sees new markup
   styled by old CSS. That is exactly what happened when the tabbed view first
   went up: the page had tabs, the cached stylesheet had never heard of them,
   and they rendered as bare buttons.

   Appending a short hash of the file's own contents gives it a new address
   whenever, and only whenever, it actually changes. */
function assetVersion(rel) {
  try {
    const buf = fs.readFileSync(path.join(ROOT, rel));
    return require('crypto').createHash('sha1').update(buf).digest('hex').slice(0, 8);
  } catch { return ''; }
}
const CSS_V = assetVersion('assets/css/site.css');
const JS_V = assetVersion('assets/js/site.js');


const SITE = {
  name: 'Mountain View Historical Association',
  url: 'https://www.mountainviewhistorical.org',
  logo: 'https://www.mountainviewhistorical.org/wp-content/uploads/2018/06/MVHA-Logo-300x300.jpg',
  defaultImage: 'https://www.mountainviewhistorical.org/wp-content/uploads/2018/06/Mountain-View-Station.png'
};

/* ---- Navigation: edit here and every page updates on the next build ---- */

const NAV = [
  { label: 'About', href: 'about.html', children: [
    { label: 'About Us', href: 'about.html' },
    { label: 'Our History', href: 'our-history.html' },
    { label: 'History Center', href: 'history-center.html' }
  ]},
  { label: 'Photos', href: 'archive.html' },
  { label: 'Archives', href: 'archives.html', children: [
    { label: 'City Directories', href: 'directories.html' },
    { label: 'City Timeline', href: 'timeline.html' },
    { label: 'Video Gallery', href: 'videos.html' },
    { label: 'Useful Links', href: 'links.html' }
  ]},
  { label: 'Books &amp; Articles', href: 'books-articles.html', children: [
    { label: 'History of Mountain View', href: 'history.html' },
    { label: 'The Castro Family Legacy', href: 'castro-legacy.html' },
    { label: 'Historical Landmarks', href: 'landmarks.html' },
    { label: 'Who&rsquo;s the Oldest?', href: 'oldest-resident.html' },
    { label: 'MVHS Eagle Monument', href: 'eagle-monument.html' },
    { label: 'News &amp; Stories', href: 'news.html' }
  ]},
  { label: 'Events', href: 'events.html' },
  { label: 'Newsletters', href: 'newsletters.html' },
  { label: 'Get Involved', href: 'join.html', children: [
    { label: 'Membership', href: 'membership.html' },
    { label: 'Volunteer', href: 'volunteer.html' },
    { label: 'Donate', href: 'donate.html' }
  ]},
  { label: 'Contact', href: 'contact.html' }
];

const SOCIAL = [
  ['Facebook', 'https://www.facebook.com/MVHistory/'],
  ['X', 'https://x.com/MtnViewHistory/'],
  ['YouTube', 'https://www.youtube.com/channel/UCAFiwAd-1vbl7DSoFTzEbZQ'],
  ['LinkedIn', 'https://www.linkedin.com/company/mountain-view-pioneer-&amp;-historical-assn/']
];

/* ---- Layout pieces ---- */

function navHtml() {
  return NAV.map(item => {
    if (!item.children) {
      return `        <li><a href="${item.href}">${item.label}</a></li>`;
    }
    const subs = item.children
      .map(c => `            <a href="${c.href}">${c.label}</a>`)
      .join('\n');
    return `        <li class="has-sub"><a href="${item.href}">${item.label}</a>\n` +
           `          <div class="subnav">\n${subs}\n          </div>\n        </li>`;
  }).join('\n');
}

function socialHtml(cls) {
  return SOCIAL.map(([label, href]) =>
    `      <a href="${href}" target="_blank" rel="noopener">${label}</a>`).join('\n');
}

function header() {
  return `<a class="skip-link" href="#main">Skip to content</a>

<div class="topbar">
  <div class="wrap">
    <nav class="topbar-social" aria-label="Social media">
${socialHtml()}
    </nav>
    <div class="topbar-actions">
      <a href="mailto:info@mountainviewhistorical.org">info@mountainviewhistorical.org</a>
      <a href="donate.html"><strong>Donate</strong></a>
    </div>
  </div>
</div>

<header class="masthead">
  <div class="wrap">
    <a class="brand" href="index.html">
      <img src="${SITE.logo}" alt="">
      <span class="brand-text">
        <span class="brand-name">Mountain View Historical Association</span>
        <span class="brand-sub">Founded 1954</span>
      </span>
    </a>

    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span class="nav-toggle-label">Menu</span>
    </button>

    <nav class="nav" id="site-nav" aria-label="Main navigation">
      <ul>
${navHtml()}
      </ul>
      <form class="nav-search" data-search-form role="search">
        <label class="visually-hidden" for="q-header">Search the site</label>
        <input type="search" id="q-header" placeholder="Search&hellip;">
        <button type="submit">Go</button>
      </form>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">

      <div>
        <h3>Mountain View Historical Association</h3>
        <p>Founded in 1954, the MVHA is a non-profit, volunteer-run organization dedicated to preserving and sharing the rich history of Mountain View, California.</p>
        <p>MVHA is a registered 501(c)(3). EIN 94-6115407.</p>
        <div class="footer-social">
${socialHtml()}
        </div>
      </div>

      <div>
        <h3>Explore</h3>
        <ul>
          <li><a href="archive.html">Photos</a></li>
          <li><a href="directories.html">City Directories</a></li>
          <li><a href="archives.html">Archives</a></li>
          <li><a href="books-articles.html">Books &amp; Articles</a></li>
          <li><a href="history.html">History of Mountain View</a></li>
          <li><a href="timeline.html">City Timeline</a></li>
        </ul>
      </div>

      <div>
        <h3>Take part</h3>
        <ul>
          <li><a href="events.html">Events</a></li>
          <li><a href="membership.html">Membership</a></li>
          <li><a href="volunteer.html">Volunteer</a></li>
          <li><a href="donate.html">Donate</a></li>
          <li><a href="newsletters.html">Newsletters</a></li>
          <li><a href="links.html">Useful Links</a></li>
        </ul>
      </div>

      <div>
        <h3>Contact</h3>
        <p>P.O. Box 252<br>Mountain View, CA 94042</p>
        <p>
          <a href="mailto:info@mountainviewhistorical.org">info@mountainviewhistorical.org</a><br>
          <a href="tel:+16509036890">(650) 903-6890</a>
        </p>
        <p><a href="contact.html">Full contact details</a></p>
      </div>

    </div>
    <div class="footer-bottom">
      <p>&copy; <span data-year>2026</span> Mountain View Historical Association</p>
      <p><a href="search.html">Search this site</a></p>
    </div>
  </div>
</footer>`;
}

/* Pages that sit in a subfolder — news/rengstorff-house.html and the like —
   need every relative link lifted by one level. Rather than thread a prefix
   through every piece of markup above, the finished page is rewritten once:
   any href or src that is genuinely relative gets the prefix, and anything
   absolute, external, a mailto/tel, or a bare #anchor is left alone. */
function applyPrefix(html, prefix) {
  if (!prefix) return html;
  return html.replace(/\b(href|src)="([^"]*)"/g, (whole, attr, value) => {
    if (/^([a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return whole;
    return `${attr}="${prefix}${value}"`;
  });
}

function layout(meta, body) {
  const title = meta.title === 'Home'
    ? SITE.name
    : `${meta.title} &mdash; ${SITE.name}`;
  const canonicalPath = meta.url !== undefined
    ? meta.url
    : (meta.slug === 'index' ? '' : meta.slug + '.html');
  return applyPrefix(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${meta.description}">
<link rel="canonical" href="${SITE.url}/${canonicalPath}">
<meta property="og:title" content="${meta.title === 'Home' ? SITE.name : meta.title + ' — ' + SITE.name}">
<meta property="og:description" content="${meta.description}">
<meta property="og:type" content="${meta.slug === 'index' ? 'website' : 'article'}">
<meta property="og:image" content="${meta.image || SITE.defaultImage}">
<meta name="twitter:card" content="summary_large_image">
${TEST_SITE ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="icon" href="${SITE.logo}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/site.css?v=${CSS_V}">
</head>
<body>

${header()}

<main id="main">
${body.trim()}
</main>

${footer()}

<script src="assets/js/site.js?v=${JS_V}"></script>
</body>
</html>
`, meta.prefix || '');
}

/* ==========================================================================
   News posts
   --------------------------------------------------------------------------
   Each post is one Markdown file in tools/content/posts/, written either by
   hand or by the admin panel at /admin. A post looks like this:

       ---
       title: The Rengstorff House at 150
       date: 2026-09-14
       summary: One sentence for the listing page and for Google.
       image: assets/images/rengstorff.jpg
       ---

       The body of the post, in Markdown.

   Two things are generated from them on every build:

     news/<slug>.html   a real, static, indexable page per post
     data/posts.json    the index the listing page and site search read

   Markdown is rendered here rather than in the browser so that search
   engines and people without JavaScript see the whole post.
   ========================================================================== */

const POSTS_DIR = path.join(CONTENT, 'posts');
const NEWS_DIR = path.join(ROOT, 'news');

/** Split a leading --- YAML block off a file. Supports the subset the admin
    panel writes: `key: value`, optionally quoted, one per line. */
function frontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    if (value === 'true' || value === 'false') value = value === 'true';
    meta[kv[1]] = value;
  }
  return { meta, body: raw.slice(m[0].length) };
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Inline Markdown: code, images, links, bold, italic. */
function inline(text) {
  const codes = [];
  // \uE000 is a private-use character: it cannot occur in real copy, so the
  // placeholder can never collide with the text around it.
  let out = String(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return '\uE000' + (codes.length - 1) + '\uE000';
  });

  out = escapeHtml(out)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      (_, alt, src, title) =>
        `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const external = /^https?:\/\//i.test(href);
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  return out.replace(/\uE000(\d+)\uE000/g, (_, i) => `<code>${escapeHtml(codes[i])}</code>`);
}

/**
 * A deliberately small Markdown renderer: headings, paragraphs, lists,
 * blockquotes, rules, images and links. That is everything the admin panel's
 * editor can produce. Anything that already looks like HTML is passed
 * straight through, so a post can drop in an embed when it needs to.
 */
function markdown(src) {
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];       // lines of the paragraph being collected
  let quote = [];      // lines of the blockquote being collected
  let list = null;     // 'ul' | 'ol' | null
  let items = [];      // text of each item in the open list

  const flushPara = () => {
    if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
  };
  const flushQuote = () => {
    if (quote.length) {
      out.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>');
      quote = [];
    }
  };
  const flushList = () => {
    if (!list) return;
    out.push(`<${list}>`);
    items.forEach(t => out.push('<li>' + inline(t) + '</li>'));
    out.push(`</${list}>`);
    list = null;
    items = [];
  };
  const flushAll = () => { flushPara(); flushQuote(); flushList(); };

  const isBlock = line =>
    /^\s*<(\/?)(div|section|figure|iframe|table|ul|ol|p|h[1-6]|blockquote|img|video|script)\b/i.test(line);

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) { flushAll(); continue; }

    // Raw HTML block — leave it exactly as written.
    if (isBlock(line)) { flushAll(); out.push(line); continue; }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) { flushAll(); out.push('<hr>'); continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushAll();
      // A post already carries its title as the <h1>, so ## is the top level here.
      out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) { flushPara(); flushList(); quote.push(quoted[1]); continue; }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushPara(); flushQuote();
      const want = bullet ? 'ul' : 'ol';
      if (list !== want) flushList();
      list = want;
      items.push((bullet || numbered)[1]);
      continue;
    }

    // A plain line directly under a list item belongs to that item — Markdown
    // calls this lazy continuation, and it is what happens whenever somebody
    // writes a bullet long enough to wrap.
    if (list && items.length) { items[items.length - 1] += ' ' + line.trim(); continue; }
    if (quote.length) { quote.push(line.trim()); continue; }

    para.push(line.trim());
  }

  flushAll();
  return out.join('\n');
}

function slugify(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

/** Plain text of a post, for the search index and for a fallback summary. */
function plainText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter(f => /\.md$/i.test(f))
    .map(file => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const { meta, body } = frontMatter(raw);
      const slug = meta.slug || slugify(path.basename(file, path.extname(file)));
      const html = markdown(body);
      const text = plainText(html);
      return {
        slug,
        file,
        title: meta.title || slug,
        date: (meta.date || '').slice(0, 10),
        author: meta.author || '',
        image: meta.image || '',
        draft: meta.draft === true,
        summary: meta.summary || (text.slice(0, 180) + (text.length > 180 ? '…' : '')),
        html,
        text
      };
    })
    .filter(p => {
      if (p.draft) { console.log(`  --  ${p.file} is a draft, not published`); return false; }
      if (!p.date) { console.error(`  !  ${p.file} has no date, skipped`); return false; }
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function postPage(post) {
  const d = new Date(post.date + 'T12:00:00');
  const pretty = isNaN(d) ? post.date : d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });

  return `
<section class="pagehead">
  <div class="wrap">
    <p class="breadcrumb"><a href="index.html">Home</a><span>&rsaquo;</span><a href="news.html">News</a><span>&rsaquo;</span>${escapeHtml(post.title)}</p>
    <h1>${escapeHtml(post.title)}</h1>
    <p class="post-meta"><time datetime="${post.date}">${pretty}</time>${post.author ? ' &middot; ' + escapeHtml(post.author) : ''}</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <article class="prose post-body">
${post.image ? `      <p><img class="post-hero" src="${escapeHtml(post.image)}" alt=""></p>\n` : ''}${post.html}
    </article>
    <p class="post-back"><a class="btn btn--ghost" href="news.html">&larr; All news &amp; stories</a></p>
  </div>
</section>
`;
}

/* ---- Build ---- */

const files = fs.readdirSync(CONTENT).filter(f => f.endsWith('.html')).sort();
const slugs = [];
let built = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(CONTENT, file), 'utf8');
  const match = raw.match(/^<!--META\s*([\s\S]*?)-->/);
  if (!match) {
    console.error(`  !  ${file} has no <!--META ... --> block, skipped`);
    continue;
  }
  const meta = JSON.parse(match[1]);
  meta.slug = path.basename(file, '.html');
  const body = raw.slice(match[0].length);
  fs.writeFileSync(path.join(ROOT, meta.slug + '.html'), layout(meta, body));
  console.log(`  ok  ${meta.slug}.html`);
  if (meta.slug !== '404') slugs.push(meta.slug);
  built++;
}

/* ---- News posts: one page each, plus the index the site reads ---- */

const posts = readPosts();
const postUrls = [];

if (posts.length) {
  fs.mkdirSync(NEWS_DIR, { recursive: true });

  // Remove pages for posts that have been deleted, so the folder always
  // matches tools/content/posts/ exactly.
  const wanted = new Set(posts.map(p => p.slug + '.html'));
  for (const stale of fs.readdirSync(NEWS_DIR).filter(f => f.endsWith('.html'))) {
    if (!wanted.has(stale)) {
      fs.unlinkSync(path.join(NEWS_DIR, stale));
      console.log(`  --  removed news/${stale} (post no longer exists)`);
    }
  }

  for (const post of posts) {
    fs.writeFileSync(path.join(NEWS_DIR, post.slug + '.html'), layout({
      title: post.title,
      description: post.summary.replace(/"/g, '&quot;'),
      image: post.image,
      slug: post.slug,
      url: 'news/' + post.slug + '.html',
      prefix: '../'
    }, postPage(post)));
    console.log(`  ok  news/${post.slug}.html`);
    postUrls.push('news/' + post.slug + '.html');
    built++;
  }
}

/* The listing page and site search both read this. It is generated — edit the
   Markdown files in tools/content/posts/, or use the admin panel, not this. */
fs.writeFileSync(path.join(ROOT, 'data', 'posts.json'), JSON.stringify({
  _comment: 'GENERATED by tools/build.js from tools/content/posts/*.md. Do not edit by hand — your changes will be overwritten on the next build.',
  posts: posts.map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    author: p.author,
    image: p.image,
    summary: p.summary,
    url: 'news/' + p.slug + '.html',
    text: p.text
  }))
}, null, 2) + '\n');
console.log(`  ok  data/posts.json (${posts.length} post${posts.length === 1 ? '' : 's'})`);

/* ---- sitemap.xml + robots.txt ---- */

const today = new Date().toISOString().slice(0, 10);

/* ---- .htaccess ----
   The production version redirects every old WordPress address to its new
   page. Those redirects are wrong in a subfolder — /mvhistory/donate/ would
   be sent to /donate.html at the top of the domain — so a test build gets a
   simpler file without them. */

const HTACCESS_COMMON = `${TEST_SITE ? `
# ---- Keep this copy out of search results ----
#
# Sends "do not index" with every file, including the JSON data files that
# have no page of their own to carry a meta tag. Visitors never see this and
# nothing about the site behaves differently — it only speaks to crawlers.

<IfModule mod_headers.c>
  Header set X-Robots-Tag "noindex, nofollow"
</IfModule>
` : ''}
# ---- Friendly error page ----

ErrorDocument 404 ${TEST_SITE ? '/mvhistory/404.html' : '/404.html'}

# ---- Compression ----

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript application/json image/svg+xml
</IfModule>

# ---- Caching ----

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css                "access plus 1 month"
  ExpiresByType application/javascript  "access plus 1 month"
  ExpiresByType image/jpeg              "access plus 1 year"
  ExpiresByType image/png               "access plus 1 year"
  ExpiresByType image/webp              "access plus 1 year"
  ExpiresByType image/svg+xml           "access plus 1 year"
  # JSON changes whenever the site is updated, so keep this short.
  ExpiresByType application/json        "access plus 1 hour"
  ExpiresByType text/html               "access plus 1 hour"
</IfModule>

# ---- Basic security headers ----

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set X-Frame-Options "SAMEORIGIN"
</IfModule>
`;

const OLD_URLS = [
  ['about-the-association', 'about'], ['our-history', 'our-history'],
  ['mountain-view-history-center', 'history-center'], ['history', 'history'],
  ['mountain-view-history-timeline', 'timeline'],
  ['castro-city-rengstorff-park', 'castro-legacy'],
  ['historical-buildings-in-mountain-view-ca', 'landmarks'],
  ['mvhs-eagle-monument', 'eagle-monument'], ['useful_links', 'links'],
  ['video-gallery', 'videos'], ['events', 'events'],
  ['oldest-living-resident', 'oldest-resident'], ['get-involved', 'join'],
  ['donate', 'donate'], ['memberships', 'membership'], ['volunteer', 'volunteer'],
  ['newsletters', 'newsletters'], ['archived-newsletters', 'newsletters'],
  ['contact-us', 'contact']
];

fs.writeFileSync(path.join(ROOT, '.htaccess'),
  TEST_SITE
    ? `# ==========================================================================
# Apache settings for the TEST copy of the site.
#
# This build is meant to sit in a subfolder, for example
# example.com/mvhistory/, so it deliberately leaves out the redirects from
# the old WordPress addresses — those only make sense once the site is at
# the top of mountainviewhistorical.org.
#
# Rebuilt automatically. Run "node tools/build.js" to get the production one.
# ==========================================================================

DirectoryIndex index.html
${HTACCESS_COMMON}`
    : `# ==========================================================================
# Apache settings for the MVHA site.
#
# Only needed on a traditional Apache host (GoDaddy, cPanel, shared hosting).
# Netlify and Cloudflare Pages read _redirects instead and ignore this file.
#
# Rebuilt automatically by tools/build.js — edit that, not this.
# ==========================================================================

DirectoryIndex index.html

# ---- Redirects from the old WordPress addresses ----

RewriteEngine On

${OLD_URLS.map(([from, to]) =>
  `RedirectMatch 301 ^/${from}/?$ /${to}.html`).join('\n')}
RedirectMatch 301 ^/events/page/.*$ /events.html
RedirectMatch 301 ^/eventbrite-event/.*$ /events.html
${HTACCESS_COMMON}`);
console.log(`  ok  .htaccess${TEST_SITE ? ' (test site: no old-URL redirects)' : ''}`);

if (TEST_SITE) {
  // Deliberately NOT "Disallow: /". Blocking crawlers would stop them reading
  // the "do not index" instruction on each page, and a blocked page that is
  // linked from somewhere else can still end up listed in Google as a bare
  // URL. Letting them in to read the no-index is what actually keeps it out.
  fs.writeFileSync(path.join(ROOT, 'robots.txt'),
    '# Test copy of the site.\n' +
    '#\n' +
    '# Crawlers are allowed in on purpose: every page and every file carries a\n' +
    '# "noindex" instruction, and a crawler has to be able to read it. Blocking\n' +
    '# them here would be self-defeating.\n' +
    '#\n' +
    '# Visitors are unaffected — anyone with the address sees the full site.\n' +
    'User-agent: *\nAllow: /\n');
  console.log('  ok  robots.txt (test site: crawlers allowed in to read the no-index)');

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) fs.unlinkSync(sitemapPath);
} else {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${slugs.map(s => `  <url>
    <loc>${SITE.url}/${s === 'index' ? '' : s + '.html'}</loc>
    <lastmod>${today}</lastmod>
    <priority>${s === 'index' ? '1.0' : '0.7'}</priority>
  </url>`).concat(posts.map(p => `  <url>
    <loc>${SITE.url}/news/${p.slug}.html</loc>
    <lastmod>${p.date}</lastmod>
    <priority>0.6</priority>
  </url>`)).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
  console.log('  ok  sitemap.xml');

  fs.writeFileSync(path.join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\n` +
    `# The editing panel is for volunteers, not for search engines.\n` +
    `Disallow: /admin/\n\n` +
    `Sitemap: ${SITE.url}/sitemap.xml\n`);
  console.log('  ok  robots.txt');
}

console.log(`\nBuilt ${built} page${built === 1 ? '' : 's'}${TEST_SITE ? ' as a TEST SITE (noindex)' : ''}.`);
if (TEST_SITE) {
  console.log('Run "node tools/build.js" without --test-site before publishing for real.');
}
