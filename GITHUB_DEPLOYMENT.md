# GitHub Deployment Plan

## Account

- GitHub user: `dglanville23`
- Git email: `dglanville@gmail.com`
- Suggested repository: `patrick-glanville-tracker`

Do not commit passwords, tokens, Social Security numbers, bank logins, medical account logins, or loan account passwords.

## GitHub Pages Setup

1. Change the GitHub password that was shared in chat.
2. Sign in to GitHub as `dglanville23`.
3. Create a new repository named `patrick-glanville-tracker`.
4. If using free GitHub Pages, confirm whether the repository and Pages visibility meet your privacy needs. GitHub Pages sites may be public even when repository access is limited, depending on plan and settings.
5. Upload these files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `.nojekyll`
6. In repository settings, enable GitHub Pages from the main branch and root folder.
7. Add collaborators by GitHub account or invite email:
   - `dglanville@gmail.com`
   - `patrick.glanville@gmail.com`
   - `courtney.glanville@gmail.com`
   - `hemmgeor@gmail.com`

## Shared Data Setup

GitHub Pages still hosts only static files, but this tracker now includes a Supabase-backed shared data mode.

To use it:

1. Create or open the Supabase project for the tracker.
2. Run `SUPABASE_SETUP.sql` in the Supabase SQL Editor.
3. Add the project URL and anon public key to `supabase-config.js`.
4. Upload `supabase-config.js`, `SUPABASE_SETUP.sql`, `index.html`, and `app.js` with the rest of the site files.

After deployment, the tracker should show `Supabase shared storage` in the Data Store line.

For the full walkthrough, use `SUPABASE_README.md`.
