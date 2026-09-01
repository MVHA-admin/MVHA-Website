# Putting the site on GoDaddy

Short version: you upload one `.zip` file and extract it. About five minutes.

---

## Step 1 — Make the zip

Double-click **`Launchers/Package For Upload.command`**.

It asks which copy you want:

- **1) Test copy** — for `dougnorris.com/mvhistory/`. Every page tells search
  engines to ignore it, so it can never appear in Google above the real site.
- **2) Real site** — for `mountainviewhistorical.org`. Includes the redirects
  from all the old WordPress addresses, and a sitemap.

Pick **1** for now. You get **`mvha-site-test.zip`** in this folder, about
4 MB. (It grew from 1.6 MB in August 2026, when the directory index went from
85,000 entries to 188,268 and the scanned-directory list was added.)

### "Hidden" means hidden from Google, not from people

The test copy is a completely normal website to anyone who visits it. Send the
address to a board member, or link to it from dougnorris.com, and they see the
full site working exactly as it will when it goes live properly. Nothing is
locked, nothing asks for a password, nothing looks different.

The only difference is invisible: every page and file carries a quiet
instruction telling search engines not to list it. So the site will not turn
up if somebody googles "Mountain View history", which is what stops a test
copy competing with the real Association website.

Note that `robots.txt` deliberately *allows* crawlers in. That looks backwards
but is correct: a crawler has to be let in to read the "do not index"
instruction. Blocking it at the door means it never reads the instruction, and
a blocked page that is linked from elsewhere — from dougnorris.com, say — can
still end up listed in Google as a bare address.

When you eventually build option **2** for the real site, all of that comes
off and the site becomes fully findable.

The zip contains only what a web host needs — the pages, `assets`, `data`, and
the hidden `.htaccess`. It leaves out the launchers, the `tools` folder, the
Python environment and this documentation, none of which belong on a server.

> Do not zip the folder yourself with Finder. Finder would include the working
> files, and the hidden `.htaccess` is easy to lose. The launcher handles both.

---

## Step 2 — Open the file manager on GoDaddy

This is the same place you put the directory search.

1. Sign in at **godaddy.com**.
2. Go to **My Products**, find your hosting plan, and press **Manage**.
3. Open **cPanel Admin** (on some plans the button says **cPanel**).
4. Under **Files**, open **File Manager**.

If your plan uses GoDaddy's own file manager rather than cPanel, the steps are
the same — the buttons are just in slightly different places.

---

## Step 3 — Go to the folder

In File Manager, open **`public_html`**. That is the top of `dougnorris.com`.

Inside it you should see the existing **`mvhistory`** folder. Open it. You will
find the three files that are there now:

```
index.html            the old directory search page
directory_index.json  the directory data
.htaccess
```

**Before you replace them**, it is worth keeping a copy — see "If you want to
go back" at the end.

---

## Step 4 — Clear out the old files

With `mvhistory` open, select those three files and delete them.

If you cannot see `.htaccess`, turn on hidden files: **Settings**, top right,
then tick **Show Hidden Files (dotfiles)**.

---

## Step 5 — Upload and extract

1. Still inside `mvhistory`, press **Upload**.
2. Drag **`mvha-site-test.zip`** onto the page, or press **Select File**.
3. Wait for it to reach 100%, then use the **Go Back** link at the bottom.
4. You should now see `mvha-site-test.zip` in the folder. Right-click it and
   choose **Extract**, then confirm.
5. When it has finished, delete `mvha-site-test.zip` — it has done its job.

You should end up with roughly 39 items: the `.html` pages, an `assets`
folder, a `data` folder, and `.htaccess`.

---

## Step 6 — Look at it

Visit **https://dougnorris.com/mvhistory/**

Check a few things:

- The homepage appears with the green header.
- **History → Historical Directories** shows the three grey filter buttons
  (*Show all*, *Businesses with addresses*, *Residences with addresses*) and,
  further down, **Browse the scanned directories** — 65 year tiles. Those tiles
  link to the Internet Archive and **will not work until the scans are uploaded
  there**; that is expected for now.
- **History → Historical Directories** loads and a search for *Rengstorff*
  returns listings.
- **Newsletters** lists 39 issues, newest first.
- The **Photo Archive** shows photographs.

If pages load but the timeline, photos or directories stay empty, that almost
always means the `data` folder did not upload. Check that
`dougnorris.com/mvhistory/data/timeline.json` opens in your browser.

---

## Updating it later

Exactly the same, minus the deleting: make a new zip, upload it into
`mvhistory`, extract, and say **yes** to overwriting. Files you have removed
locally will linger on the server, so if you ever rename or delete pages it is
cleaner to empty the folder first.

For a change to just the events, photographs, timeline or newsletters, you can
upload the single file from `data/` on its own rather than repackaging.

---

## When it goes live for real

On `mountainviewhistorical.org`, run the packager again and choose **2) Real
site**. That version drops the "ignore me" markers, adds a sitemap, and
switches on the redirects that send every old WordPress address to its new
page — which is what protects the search ranking the site has built up.

Upload it to `public_html` at the top of that domain, not into a subfolder.

---

## If you want to go back

Before deleting anything in step 4, select the three existing files, press
**Compress**, and save the zip somewhere outside `mvhistory` — in
`public_html` itself, say. If you ever want the old directory search page
back, that is all you need.

The original files are also still on your own computer at:

```
Documents/CraigStuff/Claude/Castro St/Castro Street History/Website/mvhistory
```

---

## If something goes wrong

**"403 Forbidden" on every page.** The files arrived readable only by you, so
the web server cannot open them. Two ways to fix it:

*Quickest, in File Manager:* select everything inside `mvhistory`, press
**Permissions**, and set files to **644**. Then select the `assets` and `data`
folders and set those to **755**. Reload the page.

*Or:* make a fresh zip with `Package For Upload` and re-upload. The packager
now sets these permissions itself, so a zip made with it will not have this
problem.

The numbers mean "the owner can edit, everyone else can read" — which is what
a public web page needs.

**Everything is a plain text listing with no styling.** The `assets` folder is
missing or landed in the wrong place. It must sit directly inside `mvhistory`.

**"Index of /mvhistory" appears instead of the site.** `index.html` is not in
that folder — the zip was probably extracted one level too deep. Look for an
`mvha-site-test` folder inside `mvhistory` and move its contents up a level.

**A page says "Content could not be loaded".** The `data` folder did not make
it. Upload the `data` folder on its own.

**The directory search never finishes loading.** `data/directory_index.json`
is 12.3 MB — it was 4.8 MB before the August 2026 rebuild — and is much the
largest thing in the zip, so it is the file most likely to time out on a slow
upload. Upload that one file again on its own if the search sits on "Loading".

The server sends it compressed, at roughly 3.2 MB, because the generated
`.htaccess` lists `application/json` for `mod_deflate`. If the search feels
slow for visitors, check that `.htaccess` actually made it into `mvhistory` —
it is a hidden file and the easiest one to lose.
