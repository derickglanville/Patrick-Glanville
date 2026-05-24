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

## Important Limitation

GitHub Pages hosts static files. It does not provide a private database or email-only app login for this tracker.

The current app records updates locally in each user's browser. To have everyone see the same live task data, add Firebase, Supabase, or another authenticated backend.

## Best Next Backend Choice

Firebase is a practical fit:

1. Create a Firebase project.
2. Enable Authentication with email/password or email link.
3. Enable Firestore.
4. Add the four allowed emails to an allow-list collection or security-rule check.
5. Store tracker state, comments, and history in Firestore.
6. Keep GitHub Pages as the frontend host.
