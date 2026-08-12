# Hasura Query Saver

A browser extension for Hasura's public GraphiQL console
(`cloud.hasura.io/public/graphiql`). It fixes the "my queries vanish"
problem: save queries, variables, and headers (roles, admin secrets, auth
tokens — just regular headers) locally in your browser, browse/search them,
apply one back into GraphiQL with a click, and export/import them as a JSON
file to share with teammates.

Everything is stored locally in IndexedDB. Nothing is sent anywhere — see
[`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md).

## Development

```bash
npm install
npm run build   # outputs the unpacked extension to dist/
```

Load it in Chrome: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select `dist/`.

`npm run dev` starts Vite in watch mode if you're iterating on the popup UI.

### How it works

- `src/content-main.js` runs in the **page's own JS world** (`"world": "MAIN"`
  in the manifest) because GraphiQL's CodeMirror editor instances are only
  reachable there — they're not visible to a normal ("isolated world")
  content script, which shares the DOM but not page-attached JS properties.
- `src/content-isolated.js` runs in the normal isolated world (so it has
  `chrome.runtime` access) and relays messages between the extension popup
  and `content-main.js` over `window.postMessage`.
- `src/App.jsx` is the popup UI (React + Tailwind), storing saved queries in
  IndexedDB via `src/db.js`.

## Releasing

`main` is the default development branch — every push and PR against it
runs a build-only CI check (`.github/workflows/ci.yml`).

`master` is the release branch. Pushing to it (e.g. merging `main` into
`master`) builds the extension, tags the commit with the version from
`manifest.json`, zips it, and attaches it to a GitHub Release
(`.github/workflows/release.yml`):

```bash
# bump "version" in manifest.json first, then:
git checkout master
git merge main
git push origin master
```

That same workflow will also upload the build to the Chrome Web Store as a
**draft** once the `CWS_*` secrets below are configured — it never publishes
live automatically. To push a draft live, run the workflow manually from the
Actions tab with the "publish" checkbox checked.

## Publishing to the Chrome Web Store

The very first submission has to be done by hand through Google's dashboard
— there's no way to automate creating the listing itself. After that, updates
can be automated via CI.

### 1. One-time registration

Register as a Chrome Web Store developer at the
[Developer Dashboard](https://chrome.google.com/webstore/devconsole) (one-time
$5 fee, paid by you through Google's own flow).

### 2. First submission (manual, one time)

1. `npm run build`, then zip the **contents** of `dist/` (not the folder
   itself — `manifest.json` needs to be at the zip root).
2. In the Developer Dashboard, create a new item and upload that zip.
3. Fill in the store listing (description, screenshots, category) and the
   **Privacy practices** tab — point it at a hosted copy of
   `PRIVACY_POLICY.md` (e.g. via GitHub Pages, or just the raw GitHub URL).
   Declare the permissions honestly: `activeTab` and `scripting` to read/write
   the GraphiQL page, `host_permissions` scoped to `cloud.hasura.io` only.
4. Submit for review.

Once it's approved, note the **extension ID** shown on its dashboard page —
you'll need it below.

### 3. Set up automated updates via CI

1. Go to <https://console.cloud.google.com/apis/credentials>, create a
   project (e.g. `chrome-webstore-upload`).
2. Go to <https://console.cloud.google.com/auth/overview> → **Get started**,
   set the application name, add your email, choose **Internal** as the user
   type, and finish the required fields until **Create OAuth client** is
   enabled.
3. Choose **Desktop app**, name it (e.g. `Chrome Webstore Upload`), and
   create it. Save the **Client ID** and **Client Secret** it gives you.
4. Enable the Chrome Web Store API for that project:
   <https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com>
5. Locally, run:
   ```bash
   npx chrome-webstore-upload-keys
   ```
   It'll ask for the Client ID/Secret from step 3, open a browser for you to
   approve access, and hand you a **refresh token**.
6. In the GitHub repo, go to **Settings → Secrets and variables → Actions**
   and add these repository secrets:
   - `CWS_EXTENSION_ID` — from step 2
   - `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` — from steps
     3–5

From then on, bumping `manifest.json`'s version and pushing to `master`
builds and uploads a draft update automatically; publishing it live is a
manual, deliberate step.
