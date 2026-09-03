# Mountain View Historical Association — website

A static rebuild of mountainviewhistorical.org. No WordPress, no database, no
plugins, no updates to install, no hosting bill beyond a few dollars a year
(and free on several hosts).

Everything that changes regularly — events, photographs, timeline entries,
board members — lives in plain text files in the `data/` folder. You edit
those; the pages rebuild themselves in the visitor's browser.

There is also an optional editing panel at `/admin`, so board members can
update the site through forms without touching a file. It is free, adds
nothing to the site visitors download, and is not switched on until you
follow [SETUP-CMS.md](SETUP-CMS.md). Once it is on, hand editors
[EDITING.md](EDITING.md) and nothing else.

---

## Looking at the site on your own computer

**Open the `Launchers` folder and double-click `Preview Website.command`.**

It starts a small web server, opens the site in your browser, and prints the
address. Leave the black Terminal window open while you are looking at the
site; close it when you are finished. Nothing is published to the internet and
nothing is installed.

The first time you run it, macOS may say the file is from an unidentified
developer. Right-click it instead, choose **Open**, then **Open** again. You
only have to do that once.

> Why is a server needed at all? The site loads its content from `data/*.json`,
> and browsers block that when you open a page by double-clicking the HTML file
> directly. The launcher works around it.

If you would rather do it by hand:

```
cd "path/to/MVHA Website"
python3 -m http.server 8000
```

then visit <http://localhost:8000>. Or, in Visual Studio Code, install the
"Live Server" extension, right-click `index.html` and choose *Open with Live
Server*.

---

## Changing the content

### Events

Edit `data/events.json`.

Everything sits in one list, `events`. There is deliberately no separate list
for past ones: the page reads the date and decides for itself what is still to
come, sorts upcoming events soonest-first and past ones newest-first, and stops
offering Register, "Add to calendar" and the map once a date has gone by. So an
event is written once and never has to be moved.

```json
{
  "id": "walking-tour-2026-11",
  "title": "Walking Tour of Historic Downtown Mountain View",
  "date": "2026-11-22",
  "time": "2:00 – 4:00 PM",
  "venue": "Centennial Plaza",
  "address": "600 West Evelyn Avenue, Mountain View, CA 94041",
  "description": "One paragraph.\n\nAnd another.",
  "registerUrl": "https://www.eventbrite.com/e/...",
  "image": "https://.../flyer.jpg"
}
```

- `id` must be unique. It is the address of the event's own view:
  `events.html?event=walking-tour-2026-11`.
- `date` must be `YYYY-MM-DD`. Everything else is optional.
- `description` is plain text. A blank line starts a new paragraph. The list
  shows the opening sentence or two and links to the rest.
- `registerUrl` empty, or missing, hides the Register button.

Each event opens over the list rather than on a page of its own. That is
deliberate: events are read from this file in the browser so that a change in
the editing panel shows up without a rebuild, and a page per event would only
exist after one.

`annual` is the short list of yearly community events, and `archive` is the
record of earlier quarterly programmes, kept as plain lines of text by year.

### Photographs

Edit `data/photos.json`.

Copy an existing block and change the values:

```json
{
  "id": "a-short-unique-name",
  "title": "What the photograph shows",
  "date": "circa 1953",
  "decade": 1950,
  "topic": "Downtown & Castro Street",
  "caption": "A sentence or two of context.",
  "src": "assets/images/my-photo.jpg"
}
```

- `id` must be unique. It is used for direct links like
  `archive.html?photo=a-short-unique-name`.
- `decade` drives the decade filter. Use a four-digit decade: `1880`, `1950`.
- `topic` must exactly match one of the entries in the `topics` list at the
  top of the same file. Add new topics there first.
- `src` can be a file in `assets/images/` or a full web address.
- `credit` is optional — use it for "Photo by ..." lines.

#### The Internet Archive photographs

The Photographs page shows two things at once. `data/photos.json`, above, is
the Association's own list — the one the editing panel writes to. Beside it
sits `data/photos-ia.json`, a catalogue of the thirteen hundred photographs
digitised through California Revealed, which are held by the Internet Archive
in two collections: the City library's and our own.

We keep no copy of those pictures. The page shows the Archive's thumbnail and
links to the item there. That is deliberate: the photographs outlive any
website, we store and pay for nothing, and the visitor always reaches the full
catalogue record.

**Do not edit `data/photos-ia.json` by hand.** It is generated:

```
node tools/ia/build-photos.js
```

That reads `tools/ia/ia-photos-source.csv` — the catalogue export — and writes
the JSON. Everything else is worked out there: which shelf a photograph goes on
(from its title, using the list of patterns near the top of the script), how
its date should read, and the three Internet Archive addresses, which are built
from the identifier rather than stored.

Both files share one list of topic names, because the page puts them in a
single menu. If you add a topic to `photos.json`, use the same wording as the
list in the script, or the menu will show two shelves that look identical.

Recorded oral history interviews sit in the same Archive collections. They are
counted but left out of the gallery — a row of identical placeholders helps
nobody — and the page links to them instead.

### Timeline

Edit `data/timeline.json`. Each entry needs a `year` (what is displayed), a
`sort` (the number used to put entries in order — use a decimal like `1905.1`
for a second event in the same year), an `era` matching one of the ids in the
`eras` list, a `title` and the `text`.

### Board of Directors

Edit `data/board.json`. The order in the file is the order on the page.

### News & Stories

Unlike everything else in this section, news posts are **not** in `data/`.
Each post is a Markdown file in `tools/content/posts/`, starting with a short
block of settings:

```
---
title: The Rengstorff House at 150
date: 2026-09-14
author: Mountain View Historical Association
summary: One or two sentences for the News page and for Google.
image: assets/images/rengstorff.jpg
draft: false
---

The body of the post, in Markdown. Blank line between paragraphs,
`## ` for a heading, `- ` for a bullet, `[words](page.html)` for a link,
`**bold**` and `*italic*`.
```

Only `title`, `date` and the body are required. Set `draft: true` to keep a
post out of the published site while you work on it.

Posts **do** need a rebuild, because each one becomes a real page — that is
what lets Google index them properly. Run `Rebuild Website.command` after
adding or editing a post. The build writes:

- `news/<name-of-the-file>.html` — the post itself
- `data/posts.json` — the index the News page and site search read

Both are generated. Never edit them by hand; the next build overwrites them.
Deleting a post's `.md` file deletes its page on the next build.

The Markdown renderer in `tools/build.js` deliberately covers only headings,
paragraphs, lists, quotes, links, pictures and rules. Anything that looks
like HTML is passed straight through, so a post can drop in a YouTube embed
where it needs one.

### Newsletters

The newsletters live in **two** files, and the split matters:

| File | Size | Who writes it |
| --- | --- | --- |
| `data/newsletters.json` | ~18 KB | People — by hand, or in the panel at `/admin` |
| `data/newsletter-text.json` | ~950 KB | `tools/index_newsletters.py`, never by hand |

`newsletters.json` is the list: `id`, `title`, `date`, `volume`, `url`, `cover`
and `highlights`. `newsletter-text.json` holds nothing but the words pulled out
of the PDFs, keyed by the same `id`:

```
{ "issues": { "summer-2026": { "text": "...", "pages": 12, "words": 4831 } } }
```

`assets/js/site.js` joins them back together (`joinNewsletterText`) when it
draws the Newsletters page and when it builds the search index, so the split is
invisible on the site.

**Why they are split.** A board member adds an issue through `/admin`, and
Sveltia writes back the whole file from the fields declared in
`admin/config.yml`. An undeclared field is not guaranteed to survive that round
trip — and one careless save would have taken 943 KB of extracted text with it.
Keeping the text in a file the panel never opens makes that impossible. It also
means the editing form loads in a moment instead of dragging a megabyte of PDF
text into a browser.

**Adding an issue by hand** is still fine: add an entry to `newsletters.json`
with an `id`, a `title`, a `date` and the `url` of the PDF, and leave
`highlights` empty. The indexer fills in the rest. **Do not add `text` there** —
`tools/check.js` will warn if you do, and the next indexer run moves it across
anyway.

Each issue gets two things from the indexer:

- **`text`** (in `newsletter-text.json`) — everything in the PDF, which is what
  site search looks through.
- **`highlights`** (in `newsletters.json`) — the bullet list of contents shown
  under the issue on the archive page. The indexer works these out by measuring
  type size: whatever size most of the page is set in is body copy, anything
  meaningfully bigger is an article heading.

Headline detection is a good guess, not perfect. Reword or reorder any bullet
you like — **the indexer never overwrites a `highlights` list that already has
something in it**, so your edits are safe on future runs. To make it re-derive
one, empty that issue's `highlights` back to `[]` and run the indexer again.

If an issue comes back with no contents at all, ask why:

```
.venv/bin/python tools/index_newsletters.py --diagnose winter-2026
```

That prints the type sizes it found in that PDF, which size it decided was
body copy, and what each of its two methods produced. Usually the answer is
that the headlines are not set much larger than the body, in which case
writing three or four bullets by hand is quicker than fighting it.

**Making the newsletters searchable happens by itself.**
`.github/workflows/index-newsletters.yml` runs the indexer on GitHub's own
machines whenever `data/newsletters.json` or anything in `assets/newsletters/`
changes — which is exactly what happens when somebody adds an issue in
`/admin`. It installs `pypdf`, reads the new PDF, runs `tools/check.js`, and
commits `data/newsletter-text.json` back. Cloudflare then republishes, and the
issue is searchable maybe five minutes after it was uploaded.

It also runs weekly, and there is a **Run workflow** button on the repository's
Actions tab. The commit it makes is pushed with GitHub's own token, and GitHub
does not start workflow runs from those, so it cannot set itself off in a loop.

Two things to know:

- It needs **Settings → Actions → General → Workflow permissions → "Read and
  write permissions"**. Without it the run fails at the last step.
- It commits to `main`, so **Fetch origin before your next commit** or Git will
  ask you to merge. This is the same as an issue being added in `/admin`.

**Running it yourself** — double-click `Launchers/Index Newsletters.command` —
is still worth doing when you are working offline, when you want `--diagnose`,
or for `--discover`, which asks the old WordPress site for issues not yet
listed. Run that one while the old site is still online.

After indexing, searching for a family name, a street or a business finds the
issue that mentions it and shows the passage.

This uses Python, which is already on your Mac — no Node required. The first
run creates a `.venv` folder inside the project holding one small PDF library.
Nothing is installed system-wide, and you can delete `.venv` at any time.

From Terminal the equivalents are:

```
python3 -m venv .venv                                   # first time only
.venv/bin/pip install pypdf                             # first time only
.venv/bin/python tools/index_newsletters.py             # index anything new
.venv/bin/python tools/index_newsletters.py --discover  # find unlisted issues
.venv/bin/python tools/index_newsletters.py --all       # re-read everything
```

An issue is skipped only once it has **both** its text and its contents list,
so re-running is quick but still picks up anything unfinished. If an issue
turns out to be a scan rather than a text PDF, the indexer says so and moves
on — that issue stays listed and readable, it just won't appear in search
results.

The indexer can read PDFs from your own computer too. Put them in a folder and
set each issue's `url` to something like `newsletters/Summer-2026.pdf`. A PDF
uploaded through `/admin` lands in `assets/newsletters/` and is read from there
in exactly the same way, once you have pulled the change down.

**An issue added in the panel is readable immediately and searchable within
about five minutes**, once the Action above has run and Cloudflare has
republished. In between it shows a "Not yet indexed" note and opens as a plain
PDF — nothing is lost, it simply does not turn up in search results yet.
`node tools/check.js` reports the gap: it prints how many issues are listed and
how many are searchable.

### Historical directories

`data/directory_index.json` holds 85,565 listings from the city directories,
1870–1952, and drives `directories.html`. Each entry is a compact array:

```
[ "Rengstorff, Henry", "farmer", "616 acres", "", 1882 ]
   name                occupation  address     kind   year
```

`kind` is `"B"` for a business, `"R"` for a residence, or `""` when the
directory didn't say. The file is generated separately from the scanned
directories — to update it, replace the whole file.

It is 4.8 MB, which is why it loads only on that page and is deliberately
**not** part of site search. Someone searching a surname in the header gets a
pointer to the directories rather than a five-megabyte download.

### Site search

Search covers every page, every photograph, every timeline milestone and the
full text of every indexed newsletter. Visitors can narrow it with the
**Search in** checkboxes, which show a live count per source.

If you **add a new page**, add an entry for it in `data/pages.json` so people
can find it.

---

## Changing the pages themselves

Page wording lives in `tools/content/`. Each file there is the middle of a
page — the header, navigation and footer are added automatically when you
build.

After editing anything in `tools/content/` (or the navigation in
`tools/build.js`), **double-click `Launchers/Rebuild Website.command`**. It regenerates
the `.html` files in the main folder plus `sitemap.xml` and `robots.txt`, then
runs the link checker and tells you if anything is wrong.

The equivalent from Terminal is:

```
node tools/build.js
```

Rebuilding is the one task that needs Node.js (download the LTS version from
nodejs.org). Only page wording and the navigation menu require it — everyday
content and the newsletter indexer do not.

**You do not need to run this for events, photos, timeline or board changes.**

### Adding a new page

1. Create `tools/content/my-page.html`.
2. Start it with a META block:

   ```html
   <!--META
   { "title": "My Page", "description": "A sentence for Google." }
   -->
   ```

3. Write the page body below it.
4. Add it to the navigation in `tools/build.js` if it needs a menu entry.
5. Add it to `data/pages.json` so site search can find it.
6. Run `node tools/build.js`.

---

## Checking your work

```
node tools/check.js
```

Checks that every internal link works, every asset exists, every JSON file
parses, every page has a title and heading, and that the search index matches
the real pages. Run this before publishing.

```
npm install jsdom && node tools/render-test.js
```

Optional. Loads each interactive page in a simulated browser and confirms the
timeline, photo archive, events, board list and search all actually render.

---

## Images

The pictures on the Photographs page come from the Internet Archive and need
nothing done to them. But the photographs used *in the pages themselves* — the
banner on the home page, the pictures beside articles — are still loaded from
the old WordPress server. That works straight away, but it means the new site
still depends on the old one.

To bring the images onto your own site, run this once:

```
bash tools/localise-images.sh
```

It downloads every image into `assets/images/` and rewrites the site to use
your own copies. It keeps `.bak` backups of anything it edits, so it is safe.

---

## Publishing it

**For step-by-step GoDaddy instructions, see [UPLOADING.md](UPLOADING.md).**

The short version: double-click `Launchers/Package For Upload.command`, which
makes a single `.zip` holding exactly what a web host needs. Upload that to
your hosting file manager and extract it there.

The site is plain files, so any host will do. Three good options, cheapest
first:

**Cloudflare Pages or Netlify (free).** Connect a GitHub repository or drag the
folder onto their dashboard. Both read `_redirects` automatically, so all the
old WordPress addresses keep working. HTTPS is included.

Cloudflare's current workflow is **Workers**, not Pages — the dashboard now
calls Pages "legacy". This folder is set up for Workers: `wrangler.jsonc`
says which files to publish and `.assetsignore` says which to leave out.
Connect the GitHub repository, set the build command to `node tools/build.js`
and the deploy command to `npx wrangler deploy`, and every push rebuilds and
republishes the site on its own — which is also what makes the `/admin` panel
possible. You get a free address of the form `something.workers.dev`, so the
whole site can go up and be shown to people without moving any domain.
[SETUP-CMS.md](SETUP-CMS.md) walks through it.

The `Launchers` and `tools` folders are only for working on the site locally.
They do no harm if uploaded, but you can leave them out.

**GitHub Pages (free).** Push the folder to a repository and enable Pages in
the settings. Note that GitHub Pages ignores `_redirects` — old URLs will land
on the 404 page instead of redirecting.

**Traditional web host (cPanel and similar).** Upload everything by FTP,
including the hidden `.htaccess` file, which handles the old URL redirects,
compression and caching.

### Putting up a test copy first

The site works in a subfolder as it stands — `example.com/mvhistory/` or
anywhere else. Nothing needs editing; every link is relative and the scripts
work out where they are from their own address.

Before uploading a test copy, double-click **`Launchers/Build Test Site.command`**.
That marks every page "do not index" and writes a `robots.txt` telling search
engines to stay away, so a test copy can never appear in Google above the real
site. From Terminal it is `node tools/build.js --test-site`.

When you are ready to publish for real, run **Rebuild Website** again — that
removes the no-index markers and writes a proper sitemap.

### Do not skip the redirects

The old site has been indexed by Google for years. `_redirects` (Netlify,
Cloudflare) and `.htaccess` (Apache) map every old WordPress address to its new
page with a 301 redirect, so existing links and search rankings carry over.

### Things that still live elsewhere

These were external on the old site too and continue to work unchanged:

- **Event registration** — Eventbrite
- **Pre-2015 newsletters** — Joomag, now a plain link rather than an embed.
  Issues from 2015 onward are listed year by year on your own site. To bring
  the older ones across, add them to `data/newsletters.json` and re-run the
  indexer.
- **Landmarks map** — Google My Maps (embedded on `landmarks.html`)
- **Videos** — YouTube (embedded on `videos.html`)

### Forms

The membership, donation, volunteer and contact forms currently open the
visitor's email programme with the details filled in. That needs no server and
costs nothing, but it is clumsy on some devices and card payments cannot be
taken this way.

When you are ready to improve them, the usual options are:

- **Formspree** or **Netlify Forms** — change the form's `action` to their URL
  and submissions arrive by email. Free tiers cover a small organisation.
- **Payments** — a Stripe Payment Link or PayPal button for dues and donations.
  Replace the "Join or renew" and "Make a donation" buttons with those links.

---

## What is in this folder

```
Launchers/                      Double-clickable helpers:
  Preview Website.command         View the site on your own computer.
  Rebuild Website.command         Run after editing tools/content.
  Build Test Site.command         Same, but hidden from search engines.
  Package For Upload.command      Make a .zip ready to upload to a web host.
  Index Newsletters.command       Make the newsletter PDFs searchable.
  find-node.sh                    Helper. Locates Node; not run directly.

index.html, about.html, ...     The built site. Do not edit these directly —
                                they are regenerated by tools/build.js.
sitemap.xml, robots.txt         Generated. For search engines.
_redirects, .htaccess           Old WordPress URLs → new pages.

assets/css/site.css             All styling. Colours and fonts are at the top.
assets/js/site.js               All behaviour. Renders the data files.
assets/images/                  Local image copies (after localise-images.sh).

admin/index.html                The editing panel at /admin. See SETUP-CMS.md.
admin/config.yml                What that panel is allowed to edit.

news/                           Generated. One page per news post.
data/posts.json                 Generated. The news index, for the listing
                                page and for site search.

data/events.json                Events. Edit freely.
data/photos.json                Our own photographs. Edit freely.
data/photos-ia.json             Generated. The Internet Archive catalogue —
                                run tools/ia/build-photos.js, do not edit.
data/timeline.json              City timeline. Edit freely.
data/board.json                 Board of Directors. Edit freely.
data/newsletters.json           The list of newsletter issues. Edited in /admin.
data/newsletter-text.json       Text pulled out of the PDFs, for search.
                                Generated — never edit by hand.
data/directory_index.json       188,244 city directory listings, 1870–1968.
data/pages.json                 Search index for the regular pages.

tools/build.js                  Builds the pages. Also holds the navigation.
tools/ia/build-photos.js        Turns the Internet Archive catalogue export
                                into data/photos-ia.json.
tools/ia/ia-photos-source.csv   That export. The only file to edit if a
                                photograph's title or description is wrong.
tools/check.js                  Link and data checker.
tools/package.js                Builds the upload .zip.
tools/index_newsletters.py      Reads the newsletter PDFs: full text for search,
                                plus each issue's contents list.
tools/render-test.js            Optional browser simulation tests.
tools/localise-images.sh        Downloads images off the old WordPress server.
tools/content/                  The page wording. This is what you edit.
tools/content/posts/            News posts, one Markdown file each.
```

## Colours and fonts

Open `assets/css/site.css`. Everything is defined in the `:root` block at the
very top — change a value once and it updates across the whole site.

```
--green   #2f5d50    Primary brand colour
--clay    #b4642c    Accent (apricot / orchard)
--paper   #faf8f4    Page background
--ink     #1c1a17    Body text
```
