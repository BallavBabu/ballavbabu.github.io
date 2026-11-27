# Deploying the updated site

Replace the files in your `ballavbabu.github.io` repository with everything in this folder, keeping the folder structure. Your old `publication-model.js`, `robots.txt` and `google35a700c436e44ba5.html` are included unchanged.

## Files

| File | What it does |
|---|---|
| `index.html` | Home page with profile, research, data and software, presentations, teaching |
| `cv.html` | CV tab. The PDF button appears once you set `cvPdf` in `site-config.js` |
| `ja/index.html` | Japanese page |
| `site-config.js` | Google Sheet ID and CV PDF path. The only file you normally edit |
| `working-papers.js` | Reads the Google Sheet in the visitor's browser |
| `scripts/sync_working_papers.py` | Writes the sheet rows into `index.html` and `cv.html` |
| `.github/workflows/sync-working-papers.yml` | Runs that script every 6 hours on GitHub |
| `publications.js`, `publication-model.js` | ORCID auto-update, as before, now with co-author name order fixed |
| `files/profile.jpg` | Photo. Keep it in the `files/` folder |

## Google Sheet setup (once)

1. Open the sheet "Website Working Papers (ballavbabu.github.io)" in your Drive.
2. Click Share, set General access to "Anyone with the link", role Viewer.
3. Optional but recommended. File, Share, Publish to web, choose the WorkingPapers tab, Publish.
4. The sheet ID is already in `site-config.js`.

## GitHub setup (once)

1. Create the folder `.github/workflows` in the repository and move `MOVE_TO_.github_workflows/sync-working-papers.yml` into it. Then push all files.
2. In the repository, open Settings, Actions, General. Under Workflow permissions choose "Read and write permissions" and save.
3. Open the Actions tab, choose "Sync working papers from Google Sheet", click "Run workflow" to test it.

After that, edits in the sheet appear on the site immediately for visitors (browser read) and are written into the HTML within 6 hours (GitHub Action), so Google Search can index them.

GitHub pauses scheduled workflows after 60 days without repository activity. If that happens, open the Actions tab and enable it again. The browser read keeps working regardless.

## Adding the CV PDF later

1. Put the PDF in `files/`, for example `files/Bhusal_CV.pdf`.
2. In `site-config.js` set `cvPdf: 'files/Bhusal_CV.pdf'`.
3. Push. The "Download CV (PDF)" button appears on the CV page.

## Updating other content

Publications update themselves from ORCID. Presentations, teaching and the CV sections are plain HTML. Edit them directly, and change "Last updated" in the footers.
