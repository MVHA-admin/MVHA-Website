#!/usr/bin/env node
/* ==========================================================================
   Package the site for upload
   --------------------------------------------------------------------------
   Collects exactly the files a web host needs into a single .zip, leaving out
   the working files that only matter on your own computer — the launchers,
   the tools folder, the Python environment, this README and so on.

   Run it with:   node tools/package.js
   or:            node tools/package.js --test-site

   The zip lands in the project folder, ready to upload.
   ========================================================================== */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TEST_SITE = process.argv.includes('--test-site');

/* Permissions a web server needs.
   --------------------------------------------------------------------------
   A zip records the read/write permissions of every file it holds, and the
   host applies them on extraction. Files created on a Mac are often readable
   only by their owner — but a web server runs as a different user, so it
   would be unable to read them and every page would return "403 Forbidden".
   Setting them explicitly here avoids that. */
const FILE_MODE = 0o644;   // owner can edit, everyone can read
const DIR_MODE  = 0o755;   // owner can edit, everyone can enter and read

/* Things the web host does not need. 'admin' is the editing panel: it only
   works on a host that rebuilds the site from GitHub, so it is left out of
   the zip for a traditional host, where it could only ever fail to load. */
const SKIP_DIRS = new Set(['tools', 'Launchers', '.venv', 'node_modules', '.git', 'upload', 'admin']);
const SKIP_FILES = new Set([
  'README.md', 'SETUP-CMS.md', 'EDITING.md', 'UPLOADING.md',
  '.DS_Store', 'package-lock.json', 'package.json', '.gitignore'
]);

const name = TEST_SITE ? 'mvha-site-test.zip' : 'mvha-site.zip';
const zipPath = path.join(ROOT, name);

/* Stage outside the project folder. Some folders — network drives, synced
   folders, the folder this tool is running in — refuse to let permissions be
   changed, and the permissions are the whole point of this step. */
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'mvha-package-'));

/* ---- Collect ---- */

function copyInto(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.chmodSync(to, DIR_MODE);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      copyInto(path.join(from, entry.name), path.join(to, entry.name));
    } else {
      if (SKIP_FILES.has(entry.name)) continue;
      if (entry.name.endsWith('.zip') || entry.name.endsWith('.bak')) continue;
      const target = path.join(to, entry.name);
      fs.copyFileSync(path.join(from, entry.name), target);
      fs.chmodSync(target, FILE_MODE);
    }
  }
}

fs.rmSync(stage, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });
copyInto(ROOT, stage);

/* ---- Report ---- */

function walk(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(full));
    else files.push(full);
  }
  return files;
}

const files = walk(stage);
const bytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
const mb = (bytes / 1024 / 1024).toFixed(1);

console.log('\n  ────────────────────────────────────────────────────────────');
console.log(`   Packaging ${TEST_SITE ? 'a TEST copy' : 'the site'} for upload`);
console.log('  ────────────────────────────────────────────────────────────\n');
console.log(`  ${files.length} files, ${mb} MB\n`);

const hasHtaccess = files.some(f => path.basename(f) === '.htaccess');
console.log(`  .htaccess included:      ${hasHtaccess ? 'yes' : 'NO — check this'}`);
console.log(`  pages:                   ${files.filter(f => f.endsWith('.html')).length}`);
console.log(`  data files:              ${files.filter(f => f.includes(path.sep + 'data' + path.sep)).length}`);
console.log(`  left out:                tools, Launchers, .venv, README`);

/* Every file must be world-readable or the web server returns 403 Forbidden. */
const unreadable = files.filter(f => !(fs.statSync(f).mode & 0o004));
if (unreadable.length) {
  console.error(`\n  PROBLEM: ${unreadable.length} file(s) are not readable by a web server.`);
  console.error('  Uploading these would give "403 Forbidden" on every page.');
  unreadable.slice(0, 3).forEach(f => console.error('    ' + path.relative(stage, f)));
  process.exit(1);
}
console.log(`  permissions:             644 files, 755 folders — readable by a web server\n`);

/* ---- Zip ---- */

try {
  // -r recurse, -q quiet, -X drop Mac resource forks. Run from the staging
  // folder so paths inside the zip do not start with "upload/".
  execFileSync('zip', ['-rqX', zipPath, '.'], { cwd: stage });
} catch (err) {
  console.error('  Could not create the zip automatically (' + err.message + ').');
  console.error('  The files are ready in the "upload" folder — compress that instead.\n');
  process.exit(1);
}

const zipMb = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
fs.rmSync(stage, { recursive: true, force: true });

console.log(`  Created ${name} (${zipMb} MB)`);
console.log('  ────────────────────────────────────────────────────────────\n');
console.log('  Upload that one file to your web host and extract it there.');
if (TEST_SITE) {
  console.log('  This copy tells search engines to ignore it, which is what you');
  console.log('  want for a test address.\n');
}
