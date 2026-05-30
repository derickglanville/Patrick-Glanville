# Patrick Glanville Support Tracker

Open `index.html` in a web browser to use the tracker.

The page saves changes automatically in the browser's local storage. Use **Export** regularly to create a JSON backup in this folder, and use **Import** to restore it later.

Use **Create PDF** to open the browser's print dialog, choose **Save as PDF**, and save the file to `C:\Software Development\Patrick Glanville`.

## GitHub Hosting

This folder is ready to publish as a simple GitHub Pages site:

1. Create a private GitHub repository for the tracker.
2. Upload `index.html`, `styles.css`, `app.js`, and this `README.md`.
3. In GitHub, add collaborators by email: `dglanville@gmail.com`, `patrick.glanville@gmail.com`, `courtney.glanville@gmail.com`, and `hemmgeor@gmail.com`.
4. Enable GitHub Pages from the repository settings if you want a review URL.

Important: GitHub Pages does not provide email-only login by itself. For private family data, keep the repository private or add an authenticated backend before publishing broadly. The in-page user dropdown records who made an update, but it is not a security login.

Recommended repository name: `patrick-glanville-tracker`

Expected public Pages URL if hosted under the `dglanville23` account:

`https://dglanville23.github.io/patrick-glanville-tracker/`

## Shared Data Backend

The page still works with browser local storage, but this project now includes a Supabase shared-storage path for live collaboration.

To finish the Supabase setup:

1. Create or open the Supabase project you want this tracker to use.
2. Run `SUPABASE_SETUP.sql` in the Supabase SQL Editor.
3. Paste the project's URL and anon public key into `supabase-config.js`.
4. Publish the updated files to GitHub Pages or whichever static host you use.

Detailed steps are in `SUPABASE_README.md`.

Do not put a GitHub password, personal access token, or Supabase service-role key directly into this web page. Anything shipped to GitHub Pages can be inspected by visitors.

This is an organizing tool, not legal, medical, financial, or benefits advice. Confirm Social Security, disability, bankruptcy, car-loan, and insurance decisions with the relevant agency or a qualified professional.
