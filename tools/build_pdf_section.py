#!/usr/bin/env python3
"""build_pdf_section.py — generate the "Browse the original scans" section for the
MVHA directories page, plus the Internet Archive upload manifest.

One source of truth: PDFS below, read from Mountain View Directories/PDF.
Writes:
  pdf_section.html   — the markup to paste into tools/content/directories.html
  ia_manifest.csv    — the metadata sheet for the Internet Archive upload
  pdf_preview.html   — a standalone preview that pulls in the MVHA stylesheet
"""
import csv
import json
import os
import sys

# [year, filename, bytes]
PDFS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdfs.json")))

# archive.org identifier scheme. Must be globally unique on archive.org, so it
# carries the city as well as the year.
def ident(year):
    return f"mountain-view-city-directory-{year}"

def ia_details(year):
    return f"https://archive.org/details/{ident(year)}"

def ia_pdf(year):
    return f"https://archive.org/download/{ident(year)}/{ident(year)}.pdf"

def human(n):
    mb = n / 1_000_000
    return f"{mb:.0f} MB" if mb >= 10 else f"{mb:.1f} MB"

def title(year):
    if year == 1870:
        return "Mountain View Business Directory, 1870"
    return f"Mountain View City Directory, {year}"

# Publisher. Craig's call, 2026-08-20: every volume is Polk except the two below.
# Note that the San Jose City and Santa Clara County directories of the 1900s carry
# the imprint "Polk-Husted Directory Co." rather than "R. L. Polk & Co." -- same
# house, different trading name. If the title pages are ever checked, that is the
# refinement to make here.
PUBLISHERS = {
    1914: "City of Mountain View",
    1950: "Belcher Publishing Company",
}

# The rest follow the imprint history of the San Jose city and Santa Clara County
# directory, per Stanford's catalogue record (searchworks.stanford.edu/view/477067),
# which states plainly: "Publishers: 1907/08-1925, Polk-Husted directory Co;
# 1926- R. L. Polk & Co.", and that the series was "Preceded by San Jose city
# directory, including Santa Clara County, published by F. M. Husted."
#
# So the 1926 changeover Craig was told about is right, and there is an earlier
# changeover as well: the pre-1907 volumes are Husted's, before Polk was involved
# at all.
IMPRINTS = [
    (1926, "R. L. Polk & Co."),
    (1907, "Polk-Husted Directory Co."),
    (1882, "F. M. Husted"),
]

# 1870 is a different publication -- a business directory, not part of the Husted
# series -- and its title page is not in the scan. Left blank rather than guessed;
# IA does not require a creator.
UNKNOWN_PUBLISHER_YEARS = {1870}


def publisher(year):
    if year in PUBLISHERS:
        return PUBLISHERS[year]
    if year in UNKNOWN_PUBLISHER_YEARS:
        return ""
    for start, name in IMPRINTS:
        if year >= start:
            return name
    return ""


# The City of Mountain View Library's rights statement, which these scans carry.
# Applied to every item. Note it says the copyright status is UNKNOWN, which is why
# no public-domain licenceurl is asserted alongside it -- the two would contradict
# each other on the same page.
RIGHTS = (
    "Copyright status unknown. This work may be protected by the U.S. Copyright "
    "Law (Title 17, U.S.C.). In addition, its reproduction may be restricted by "
    "terms of gift or purchase agreements, donor restrictions, privacy and "
    "publicity rights, licensing and trademarks. This work is accessible for "
    "purposes of education and research. Transmission or reproduction of works "
    "protected by copyright beyond that allowed by fair use requires the written "
    "permission of the copyright owners. Works not in the public domain cannot be "
    "commercially exploited without permission of the copyright owner. "
    "Responsibility for any use rests exclusively with the user. City of Mountain "
    "View Library attempted to find rights owners without success but is eager to "
    "hear from them so that we may obtain permission, if needed. Upon request to "
    "libraryadultservices@mountainview.gov, digitized works can be removed from "
    "public view if there are rights issues that need to be resolved."
)

# The same statement for the website, with the address as a link.
RIGHTS_HTML = RIGHTS.replace(
    "libraryadultservices@mountainview.gov",
    '<a href="mailto:libraryadultservices@mountainview.gov">'
    'libraryadultservices@mountainview.gov</a>')

# The 1914 scan is not the printed book: it is a typescript copy made by Mildred
# Winters from a pocket directory belonging to Arthur Brown, so it is described
# differently.
TYPESCRIPT_YEARS = {1914}

DESC = (
    "Residents, their occupations, and local businesses of Mountain View, Santa "
    "Clara County, California, from the {year} city directory. {provenance}"
)
SCAN_PROV = "Scanned from the original volume."

# Up to and including 1949 the Mountain View listings were a section inside the
# San Jose / Santa Clara County directory, not a book of their own -- which is why
# the printed page numbers run into the hundreds (1894 opens at page 557).
#
# Verified from the title pages in the scans, 2026-08-27: 1947 and 1949 are headed
# "Santa Clara County Directory" with a "MOUNTAIN VIEW" section inside, while 1952,
# 1954 and 1962 are each headed "Polk's Mountain View City Directory". Craig had
# put the changeover at 1962; it is actually 1950.
LAST_EXCERPT_YEAR = 1949

# Parent volume titles, from Stanford's catalogue record for the series.
PARENT_TITLES = [
    (1926, "Polk's San Jose City and Santa Clara County Directory"),
    (1907, "Polk-Husted Directory Co.'s San Jose City and Santa Clara County Directory"),
    (1882, "San Jose City Directory, including Santa Clara County"),
]


def excerpt_note(year):
    """The sentence explaining that this is a section of a larger volume."""
    if year > LAST_EXCERPT_YEAR:
        return ""
    if year in PUBLISHERS or year in UNKNOWN_PUBLISHER_YEARS:
        return ""          # 1914 is its own pocket directory; 1870 is a business list
    for start, name in PARENT_TITLES:
        if year >= start:
            return (f" These pages are the Mountain View section of the {year} "
                    f"{name}, not a separate volume, so the printed page numbers "
                    "are those of the parent directory. Mountain View was first "
                    "given a directory of its own in 1950.")
    return ""
TYPESCRIPT_PROV = ("Reproduced from a typescript copy of the original pocket "
                   "directory, typed by Mildred Winters from the volume belonging "
                   "to Arthur Brown; the printed original has not been scanned.")

# ---------------------------------------------------------------- section ---
def section_html():
    by_decade = {}
    for year, _f, size in PDFS:
        by_decade.setdefault(year // 10 * 10, []).append((year, size))

    rows = []
    for dec in sorted(by_decade):
        items = "\n".join(
            f'          <a class="pdf-year" href="{ia_details(y)}" target="_blank" rel="noopener">'
            f'<span class="pdf-year-n">{y}</span>'
            f'<span class="pdf-year-s">{human(sz)}</span></a>'
            for y, sz in sorted(by_decade[dec])
        )
        rows.append(
            f'      <div class="pdf-decade">\n'
            f'        <h3 class="pdf-decade-h">{dec}s</h3>\n'
            f'        <div class="pdf-years">\n{items}\n        </div>\n'
            f'      </div>'
        )

    return f'''<section class="section section--tint" id="scans">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">The original pages</p>
      <h2>Browse the scanned directories</h2>
      <p>Every volume behind this search is also available as a complete scan &mdash;
        {len(PDFS)} directories, {PDFS[0][0]} to {PDFS[-1][0]}. They are free to read online
        and free to download, hosted by the Internet Archive.</p>
      <p>The scans show the printed page exactly as it was, advertisements and all, which
        is often worth seeing in its own right &mdash; and it is where to look when a
        transcribed entry seems wrong or a line is hard to make sense of.</p>
      <p>Up to 1949 these are the Mountain View pages lifted out of the San Jose and
        Santa Clara County directory &mdash; Mountain View was not given a directory of
        its own until 1950, which is why the earlier page numbers run into the
        hundreds.</p>
    </div>

    <div class="pdf-decades">
{chr(10).join(rows)}
    </div>

    <p class="hint" style="margin-top:1.5rem">Each year opens on the Internet Archive, where
      you can read it a page at a time or download the whole volume as a PDF. The larger
      post-war books run to well over 100&nbsp;MB, so downloading those is best left to a
      decent connection.</p>

    <p class="rights-note"><strong>Rights.</strong> {RIGHTS_HTML}</p>
  </div>
</section>'''

def panel_html():
    """The same list, minus the outer <section> wrapper — for the tab panel."""
    body = section_html()
    body = body.split(">", 1)[1]                    # drop <section ...>
    body = body.rsplit("</section>", 1)[0]
    body = body.replace('<div class="wrap">', "", 1)
    body = body.rsplit("</div>", 1)[0]              # drop the matching </div>
    return body.strip()


CSS = '''
/* --- scanned directory list (directories.html) --------------------------- */
.pdf-decade { margin: 0 0 1.4rem; }
.pdf-decade-h { font-size: .95rem; letter-spacing: .06em; text-transform: uppercase;
                color: var(--ink-faint, #6b7280); margin: 0 0 .55rem; font-weight: 600; }
.pdf-years { display: flex; flex-wrap: wrap; gap: .5rem; }
.pdf-year { display: inline-flex; flex-direction: column; align-items: center;
            min-width: 5.2rem; padding: .5rem .7rem; border-radius: 10px;
            border: 1px solid var(--line, #e3dccb); background: var(--card, #fff);
            text-decoration: none; transition: border-color .12s, transform .12s; }
.pdf-year:hover { border-color: var(--green, #1f6f5c); transform: translateY(-1px); }
.pdf-year-n { font-weight: 700; font-size: 1.02rem; color: var(--ink, #33302a);
              font-variant-numeric: tabular-nums; }
.pdf-year-s { font-size: .72rem; color: var(--ink-faint, #8a8175); margin-top: .1rem; }
'''

# ---------------------------------------------------------------- manifest ---
def manifest():
    out = []
    for year, fname, size in PDFS:
        out.append({
            "identifier": ident(year),
            "file": fname,
            "title": title(year),
            "date": f"{year}-01-01",
            "year": year,
            "mediatype": "texts",
            "collection": "opensource",           # confirm before upload
            "creator": publisher(year),
            "publisher": publisher(year),
            "language": "eng",
            # IA wants multi-value fields as indexed columns, not one joined
            # string -- otherwise "a; b; c" becomes a single subject.
            "subject[0]": "Mountain View (Calif.)",
            "subject[1]": "Santa Clara County (Calif.)",
            "subject[2]": "city directories",
            "subject[3]": "genealogy",
            "subject[4]": "local history",
            "coverage": "Mountain View, Santa Clara County, California",
            "description": DESC.format(
                year=year,
                provenance=(TYPESCRIPT_PROV if year in TYPESCRIPT_YEARS
                            else SCAN_PROV) + excerpt_note(year)),
            "rights": RIGHTS,
            "contributor[0]": "City of Mountain View Library",
            "contributor[1]": "Mountain View Historical Association",
        })
    return out


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "pdf_panel.html"), "w") as fh:
        fh.write(panel_html() + "\n")

    with open(os.path.join(here, "pdf_section.html"), "w") as fh:
        fh.write(section_html() + "\n\n<!-- add to assets/css/site.css: -->\n<style>"
                 + CSS + "</style>\n")

    rows = manifest()
    with open(os.path.join(here, "ia_manifest.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    total = sum(s for _y, _f, s in PDFS)
    print(f"{len(rows)} volumes, {total/1e9:.2f} GB")
    print("wrote pdf_section.html, ia_manifest.csv")
