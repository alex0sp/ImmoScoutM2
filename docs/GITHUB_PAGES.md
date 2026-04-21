# Publish this privacy policy on GitHub Pages

The privacy policy for the Chrome Web Store lives at **`docs/privacy.html`**.

## 1. Push the `docs/` folder to GitHub

Commit and push `docs/privacy.html` and `docs/.nojekyll` to your repository (for example `ImmoScoutM2`).

## 2. Turn on GitHub Pages

1. On GitHub, open the repository → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. **Branch:** `main` (or your default branch).
4. **Folder:** `/docs` (not “/ (root)”).
5. Click **Save**.

After a minute or two, GitHub shows your site URL, usually:

`https://<your-username>.github.io/<repository-name>/`

## 3. Privacy policy URL for the Chrome Web Store

In the Developer Dashboard, set **Privacy policy URL** to:

`https://<your-username>.github.io/<repository-name>/privacy.html`

Replace `<your-username>` and `<repository-name>` with your real values. Open that link in a browser to confirm it loads before you submit the listing.

## Notes

- The site must be served over **HTTPS** (GitHub Pages does this by default).
- If Pages does not update after a change, wait a few minutes or trigger a new commit.
- File **`docs/.nojekyll`** disables Jekyll so the static HTML is served as-is.
