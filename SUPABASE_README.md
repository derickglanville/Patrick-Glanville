# Supabase Shared Data Setup

This tracker can use Supabase as the single shared data source for all users.

## 1. Create a Supabase project

Create a free Supabase project, then open the project's SQL Editor.

## 2. Run the setup SQL

Run the contents of `SUPABASE_SETUP.sql` in the Supabase SQL Editor.

This creates one shared table:

- `public.tracker_state`

The app stores the full tracker state in the row with this id:

- `patrick-glanville`

## 3. Add the project credentials

In Supabase, go to:

`Project Settings -> API`

Copy:

- Project URL
- anon public key

Paste them into `supabase-config.js`:

```js
window.PATRICK_SUPABASE_CONFIG = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-anon-public-key"
};
```

The anon key is intended for browser use. Do not put the service role key in this file.

## 4. Publish

Commit and push `supabase-config.js`, `SUPABASE_SETUP.sql`, `index.html`, and `app.js`.

After GitHub Pages updates, the Data Store line should say `Supabase shared storage`.

## Important

This first Supabase version stores the whole tracker as one shared JSON document. That is enough to give everyone one source of truth. If multiple users save at the exact same time, the latest save wins. A future version can move tasks, notes, bills, and comments into separate database tables for stronger conflict handling.
