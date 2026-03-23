# Pivot Website (Static)

This folder contains the Pivot marketing site as a static multi-page website (no build step).

## What’s included

- `index.html` (Home)
- `features.html` (Focus / Vent / Move)
- `pro.html` (Pivot Pro)
- `journal.html` (Journal + weekly analysis overview)
- `research.html` (scholarly evidence behind Pivot)
- `privacy.html` and `terms.html` (placeholders)
- `contact.html` (contact form UI)
- Shared assets:
  - `css/site.css`
  - `js/site.js`
  - `assets/logo.svg`

## GitHub Pages deployment

1. Commit this folder to your repository.
2. Go to **Settings → Pages** in GitHub.
3. Set **Build and deployment** source to **Deploy from a branch**.
4. Set the branch to `main` (or your default branch).
5. Set the folder to **`/PivotWebsite`**.
6. Save. GitHub Pages will publish the site.

## Netlify deployment (optional)

1. Create a Netlify site connected to your repo.
2. Set the publish directory to `PivotWebsite`.
3. Save and deploy.

## Contact form note

`contact.html` uses a placeholder endpoint (`REPLACE_ME`). Before publishing, replace:

- `https://formspree.io/f/REPLACE_ME`

with your real form endpoint, **or** update the mail target in the `mailto:` fallback inside `js/site.js`.

# PivotWebsite
