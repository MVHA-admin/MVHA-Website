# MVHA Website — context for Claude

Read this first. It is the state of the project as of **2 September 2026**,
written so a new session on a different computer can pick up without Craig
having to re-explain anything.

---

## What this is

A static rebuild of **mountainviewhistorical.org**, replacing WordPress, for
the Mountain View Historical Association — a volunteer-run 501(c)(3). Craig
Norris built it. The board will eventually maintain it, which is why every
decision favours "still works in five years with nobody technical around"
over "clever".

There is no database, no server, no CMS software to patch. The site is plain
files. Content lives in `data/*.json` and `tools/content/`.

## Live addresses

| Thing | Where |
| --- | --- |
| Test site | https://mvha-website.mvha.workers.dev |
| Editing panel | https://mvha-website.mvha.workers.dev/admin |
| Repository | github.com/MVHA-admin/mvha-website (private) |
| Sign-in gatekeeper | https://sveltia-cms-auth.mvha.workers.dev |
| Cloudflare | separate MVHA account, subdomain `mvha.workers.dev` |
| GitHub | account `MVHA-admin` |
| Old GoDaddy test copy | dougnorris.com/mvhistory (manual zip upload, still in use) |

The real domain has **not** moved. This is a proof of concept to show the
board before touching `mountainviewhistorical.org` DNS.

## How it is published

GitHub → Cloudflare Workers. Every push rebuilds and republishes
automatically, which is also what makes `/admin` possible.

- Build command: `node tools/build.js`
- Deploy command: `npx wrangler deploy`
- `wrangler.jsonc` says which files to publish; `.assetsignore` says which to
  leave out (tools/, Launchers/, *.md, .htaccess, _to_delete/).

**Cloudflare Workers, not Pages** — the dashboard now calls Pages "the legacy
Pages workflow", and this project deliberately avoids it so nobody has to
migrate later.

## Editing panel

**Sveltia CMS** at `/admin`, git-backed, signing in with GitHub. Chosen over
Decap (stagnant, and Netlify Identity is deprecated). Four collections:
News & Stories, Events, Photographs, Board of Directors. Config in
`admin/config.yml`.

Editors are board members added as repository collaborators. Saving in the
panel commits to GitHub, which triggers a rebuild — live in a minute or two.

## Architecture notes worth knowing before changing anything

- **`tools/build.js` builds the site.** It wraps fragments from
  `tools/content/` in the shared header/nav/footer. The navigation menu is a
  `NAV` array near the top of that file.
- **Two build modes.** `node tools/build.js` is production;
  `--test-site` adds noindex and drops the old-WordPress redirects (because
  the GoDaddy copy sits in a subfolder). Running the wrong one before
  packaging is the easy mistake.
- **News posts are build-time.** Each post is a Markdown file in
  `tools/content/posts/` with YAML front matter. The build renders it to a
  real page at `news/<slug>.html` and writes `data/posts.json` for the
  listing page and site search. Done this way so Google can index posts.
  The Markdown renderer is small and self-contained inside `build.js` —
  deliberately no npm dependency, so `Rebuild Website.command` works with
  nothing installed.
- **Generated, never edit by hand:** every `*.html` in the root, `news/`,
  `data/posts.json`, `sitemap.xml`, `robots.txt`, `.htaccess`.
- **Day-to-day content needs no rebuild.** Events, photos, timeline and board
  come from `data/*.json`, read in the browser. Only page wording and news
  posts require a build.
- **The menu has four top-level sections for content**: Photographs, Archives
  (directories, timeline, videos, links), Books & Articles (the history
  overview, the four articles, the three books, news posts) and Newsletters.
  There is deliberately no "History" tab — the whole site is about the history
  of Mountain View, so the word carried no information and read as though it
  meant the history of the Association. Changed 2 September 2026 after board
  feedback; `archives.html` and `books-articles.html` are the two landing
  pages this added.
- **Photographs come from the Internet Archive.** `data/photos-ia.json` lists
  1,298 pictures digitised through California Revealed and held in two IA
  collections — `mountainviewlibrary` (the City library's) and
  `mountain-view-historical-association` (ours, 77 items). The site stores no
  copies: it shows IA's thumbnail and links to the item. The file is generated
  by `node tools/ia/build-photos.js` from `tools/ia/ia-photos-source.csv`,
  which came out of the Castro Street Archive project's `cmv_catalog`. Topics
  are derived from titles by pattern, because the IA records carry almost no
  subject headings. `data/photos.json` is separate and stays editable in the
  CMS; the page merges the two and both share one topic vocabulary.
- **MVHA already has its own Internet Archive collection.** Worth remembering
  before the directory scans go up — the upload plan in the Castro Street
  project assumed `opensource` was the only option.
- `node tools/check.js` verifies links, assets, JSON and the search index.
  Run it before publishing.

## Working arrangement — please respect these

**The folder is inside iCloud Drive** (macOS Documents syncing; the real path
is under `~/Library/Mobile Documents/`). Craig uses two Macs and has decided
knowingly to keep it there. **Do not suggest moving it out.** The agreed
mitigations:

- Keep Downloaded is on, on both machines
- One machine at a time; wait for iCloud to finish syncing before switching
- Quit GitHub Desktop on the machine not in use
- Do **not** clone on the second Mac — the folder syncs itself, `.git`
  included

If Git ever gets into a strange state, the fix is to re-clone from GitHub,
not to repair in place.

**Do not run git *write* commands through the remote-devices bridge.** It
cannot delete files, so a stale `.git/index.lock` gets left behind and blocks
GitHub Desktop with "A lock file already exists in the repository". Use
`git --no-optional-locks` for reads, and leave commits and pushes to Craig in
GitHub Desktop.

## Gotchas already hit — check these first

- **Cloudflare versions vs deployments.** Saving Worker variables creates a
  new *version* but does not put it into service. Symptom: "OAuth app client
  ID or secret is not configured". Fix: Deployments → ⋯ on the newest
  version → Deploy.
- **Browser cache.** `admin/config.yml` and the stylesheet get cached. Check
  in a private window before concluding a deploy failed.
- **`_redirects` is not portable.** Netlify's `/* /404.html 404` catch-all is
  rejected by Cloudflare, which only accepts redirect status codes. It is
  commented out; `not_found_handling` in `wrangler.jsonc` does that job.

## Where things stand

Setup is complete and working end to end: editing in `/admin` publishes to
the live site. Still to do, roughly in order:

1. **Add board members** as repository collaborators (GitHub → repo →
   Settings → Collaborators). Send them `EDITING.md`.
2. **Show the board** the test site and get a decision.
3. **Forms and payments.** Membership, donation, volunteer and contact forms
   still just open the visitor's email app. Formspree plus a Stripe or PayPal
   link is the identified fix.
4. **`tools/localise-images.sh`** — the pictures used *inside pages* (the home
   page banner, article illustrations) are still served from the old WordPress
   server, so it cannot be switched off until this is run. The Photographs
   page is no longer part of that problem: it points at the Internet Archive.
5. **Before the real domain moves** — put the repo in a GitHub Organization
   and register the permanent Cloudflare account to an MVHA-owned email
   address, so none of this depends on one volunteer's personal accounts.

## Documentation in this folder

| File | For whom |
| --- | --- |
| `README.md` | Whoever maintains the site — how to edit, build, publish |
| `UPLOADING.md` | Publishing the zip to GoDaddy |
| `SETUP-CMS.md` | How the editing panel was set up, and troubleshooting |
| `EDITING.md` | Board members. No jargon, no mention of Git |

## House style for anything you write

Plain English, written for a non-technical volunteer successor. Short
sentences. Explain *why*, not just which button. Match the tone of the four
files above.

Craig pushes back on advice he finds unconvincing, and the pushback is
usually well-founded — give the reasoning and the alternative, then let him
choose. When a vendor's dashboard is involved, check current documentation
rather than describing it from memory; several steps here failed because the
UI had moved on.
