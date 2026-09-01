# Turning on the editing panel

This sets up `/admin` — a proper login page where board members edit events,
photographs, the board list and news posts through forms, without ever seeing
a JSON file.

It takes about an hour, once. Everything below is free.

---

## How it will work when it is done

1. A board member goes to `your-site-address/admin` and signs in with GitHub.
2. They fill in a form and press **Publish**.
3. That writes the change back to the site's files and the site rebuilds
   itself. The change is live in a minute or two.

There is no database and no server of our own. Every edit is recorded, so
anything can be undone.

---

## Before you start

You need two free accounts. If you already have them, skip ahead.

- **GitHub** — <https://github.com/signup>. This is where the site's files
  will live.
- **Cloudflare** — <https://dash.cloudflare.com/sign-up>. This is what puts
  the site on the web and rebuilds it after each edit.

That is it. No credit card, no hosting bill.

> **This does not touch dougnorris.com or GoDaddy.** Cloudflare gives the
> project its own address ending in `.pages.dev` — something like
> `mvha.pages.dev`. That is a real, working, public website you can show the
> board. The GoDaddy test copy can carry on exactly as it is. Only much
> later, if the board says yes, does `mountainviewhistorical.org` get pointed
> at it — and that is one DNS setting, not a re-run of any of this.

---

## Step 1 — Put the site on GitHub

### First: a note about iCloud Drive

This folder lives in iCloud Drive. Finder shows it as `Documents`, but its
real path is under `Library/Mobile Documents/` — that is what macOS does when
it is set to sync the Documents folder.

That is fine, and it is how this project is set up deliberately, so the same
folder is available on more than one Mac. It does mean two rules matter once
Git is involved, because from Step 1 onwards the folder contains a hidden
`.git` folder that Git reads and writes constantly:

1. **Keep Downloaded must stay on, on every machine.** Right-click the folder
   in Finder and check it. Without it, iCloud eventually deletes the local
   copy of files you have not opened lately and leaves a placeholder. Git
   cannot read a placeholder — it sees the file as missing.

2. **Only one machine at a time, and let iCloud finish before you switch.**
   Before starting work on the other Mac, look at the Finder sidebar and wait
   for the iCloud progress circle to clear. Committing on one machine while
   the other's changes are still in flight is the one thing that can damage
   Git's record of the project.

A third habit that costs nothing: **quit GitHub Desktop on the machine you
are not using.** It checks for changes in the background, and background
writes are exactly what you do not want happening on two machines at once.

Because the folder syncs by itself, you do **not** clone the repository on
the second Mac. It is already there, `.git` and all. Just open GitHub Desktop
on that machine and it will recognise the folder.

> **If it ever does go wrong, it is a two-minute fix, not a disaster.**
> Everything of value is on GitHub. Drag the local folder to the Trash,
> then in GitHub Desktop choose *Clone repository* and pick `mvha-website`.
> You are back exactly where you were, minus anything you had not yet
> pushed. This is worth knowing precisely so that a strange Git error is
> never something to fight with.

### Then: create the repository

1. Sign in to GitHub and press **New repository**.
2. Name it `mvha-website`. Leave it **Public** (Cloudflare's free tier is
   simplest that way, and there is nothing secret in it). Do **not** tick
   "Add a README".
3. Press **Create repository**.

Now upload the folder, using **GitHub Desktop**
(<https://desktop.github.com>) if you would rather not use Terminal:

*File → Add local repository →* choose the `MVHA Website` folder.

It will say **"This directory does not appear to be a Git repository"** and
offer to **create a repository here instead**. That is expected — the folder
has never been under version control. Click that link, then **Create
repository**, then **Publish repository** on the next screen.

Untick **"Keep this code private"** when publishing, so it matches the
public repository you made in step 2.

From Terminal it is:

```
cd "path/to/MVHA Website"
git init
git add .
git commit -m "The site as it stands"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/mvha-website.git
git push -u origin main
```

`.gitignore` already keeps out the things that should not be uploaded — the
Python folder, the `.zip` packages, and macOS's `.DS_Store` clutter.

---

## Step 2 — Put it on the web with Cloudflare Pages

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
   Connect to Git**.
2. Authorise Cloudflare to see your GitHub account and pick `mvha-website`.
3. On the build settings screen:

   | Setting | Value |
   | --- | --- |
   | Framework preset | **None** |
   | Build command | `node tools/build.js` |
   | Build output directory | `/` |

4. Press **Save and Deploy**.

A minute later you have a working site at `https://something.pages.dev`.
Write that address down — you need it twice more below.

**That is the proof of concept.** You can stop here, send the address round
the board, and come back to the rest when you are ready.

---

## Step 3 — Set up the login

The editing panel needs a way to check that whoever is at `/admin` is
allowed to be there. It does that with GitHub, through a tiny free
gatekeeper that you deploy once and then forget about.

### 3a. Deploy the gatekeeper

1. Go to <https://github.com/sveltia/sveltia-cms-auth>.
2. Press the **Deploy to Cloudflare Workers** button in its README and follow
   the prompts.
3. When it finishes, copy the worker's address. It looks like
   `https://sveltia-cms-auth.YOUR-NAME.workers.dev`.

### 3b. Register the site with GitHub

1. On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth
   App** (or go straight to <https://github.com/settings/developers>).
2. Fill it in:

   | Field | Value |
   | --- | --- |
   | Application name | `MVHA website editor` |
   | Homepage URL | your `.pages.dev` address |
   | Authorization callback URL | your worker address **followed by `/callback`** |

   The callback must end in `/callback` — for example
   `https://sveltia-cms-auth.craig.workers.dev/callback`. This is the single
   most common thing to get wrong.

3. Press **Register application**, then **Generate a new client secret**.
   You now have a **Client ID** and a **Client Secret**. The secret is shown
   once — copy it now.

### 3c. Give the gatekeeper those two values

Back in Cloudflare: **Workers & Pages → sveltia-cms-auth → Settings →
Variables and Secrets**. Add three:

| Name | Value | Type |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | the Client ID | Text |
| `GITHUB_CLIENT_SECRET` | the Client Secret | **Secret** (encrypted) |
| `ALLOWED_DOMAINS` | your `.pages.dev` hostname | Text |

Deploy the worker again so the new values take effect.

`ALLOWED_DOMAINS` means only your site can use this login. Leave it out and
anyone could point their own site at your gatekeeper.

---

## Step 4 — Fill in the two blanks

Open `admin/config.yml`. Near the top are two lines marked **CHANGE ME**:

```yaml
backend:
  name: github
  repo: CHANGE-ME/mvha-website              # ← your GitHub username/repo
  branch: main
  base_url: https://CHANGE-ME.workers.dev   # ← your worker address
```

Replace both, save, and push the change to GitHub (in GitHub Desktop:
*Commit*, then *Push origin*).

While you are in there, you may also want to change `site_url` and
`display_url` from `mountainviewhistorical.org` to your `.pages.dev`
address, so the "view the live page" links in the panel point at the test
site rather than the old one.

---

## Step 5 — Try it

Go to `https://your-address.pages.dev/admin`.

You should get a **Sign in with GitHub** button. Sign in, and you should see
four sections: News & Stories, Events, Photographs, and Board of Directors.

Make a small change — add a full stop somewhere — and press **Publish**.
Then watch **Workers & Pages → your project → Deployments** in Cloudflare:
a new build starts within a few seconds and the change is live when it
finishes.

If that works, everything works.

---

## Step 6 — Let the board in

Each person who will edit needs a free GitHub account, and then:

**GitHub → your repository → Settings → Collaborators → Add people.**

Enter their GitHub username. They get an email invitation; once they accept,
`/admin` works for them.

Give them [EDITING.md](EDITING.md) — it is written for someone who has never
seen any of this and does not mention GitHub, JSON or builds at all.

---

## If something does not work

**"Not Found" or a blank page at /admin.**
The `repo:` line in `admin/config.yml` is wrong, or the change was not pushed
to GitHub. It must be exactly `username/repository-name`.

**Sign-in opens a GitHub page that says the redirect URI does not match.**
The callback URL in the OAuth App does not end in `/callback`, or does not
exactly match the worker address.

**Sign-in works, then the panel says it cannot load the repository.**
That person has not been added as a collaborator, or has not accepted the
invitation yet.

**An edit publishes but the site does not change.**
Look at the deployment log in Cloudflare. If the build failed, the log says
which file it choked on. The site stays on the last good version until the
build succeeds, so a bad edit can never take the site down — it just does
not appear.

**A news post does not show up.**
Check that "Keep as a draft" is unticked, and that it has a date.

---

## What this changes about the existing setup

- **Nothing about how the site is built.** `Rebuild Website.command`,
  `Preview Website.command` and the newsletter indexer all work exactly as
  before. Cloudflare simply runs the same `node tools/build.js` that you run
  by hand.
- **`Package For Upload.command` still works.** If you want to keep a copy on
  GoDaddy, build and upload it as you do now. Just remember that copy is a
  snapshot — edits made in `/admin` land on the Cloudflare site, not on the
  GoDaddy one.
- **The data files get reformatted.** When the panel saves
  `data/events.json`, it rewrites the whole file tidily. The content is
  identical; the line breaks may move. That is normal and harmless.
