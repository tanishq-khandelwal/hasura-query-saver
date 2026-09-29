# Query Saver for Hasura GraphiQL

A browser extension for Hasura's public GraphiQL console
(`cloud.hasura.io/public/graphiql`). It fixes the "my queries vanish"
problem: save queries, variables, and headers (roles, admin secrets, auth
tokens — just regular headers) locally in your browser, browse/search them,
apply one back into GraphiQL with a click, and export/import them as a JSON
file to share with teammates.

> Unofficial community tool — not affiliated with or endorsed by Hasura.

Everything is stored locally in IndexedDB. Nothing is sent anywhere — see
[`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md).

## Features

- **One-click save** — captures the current query, variables, and headers
  from GraphiQL, named after the operation.
- **One-click apply** — loads a saved query back into GraphiQL. Whatever was
  in the editor is auto-saved first, and a **Restore** action puts it back.
- **Side panel** — stays open next to GraphiQL while you work (a popup would
  close, and lose your draft, on the first click into the page).
- **Search** across names, queries, variables, and header keys (`/` to focus).
- **Edit, duplicate, delete** — deletes can be undone.
- **Header values masked** until you click *Show values*.
- **Export / import** as JSON. Exports blank header values by default so
  secrets don't leak; including them is a separate, clearly marked option.
  Imports skip duplicates.

## Usage

1. Open <https://cloud.hasura.io/public/graphiql> and click the extension's
   toolbar icon — the side panel opens and shows *Connected to GraphiQL*.
2. Write a query, then hit **Save current GraphiQL query**.
3. Pick any saved query and hit **Apply to GraphiQL** (or the ▶ button on
   hover in the list).
4. Use the **⋯** menu to import or export.

Keyboard: `/` search · `⌘S` / `Ctrl+S` save while editing · `Esc` cancel.

## Development

```bash
npm install
npm test        # runs the src/*.test.js checks (plain node --test)
npm run build   # outputs the unpacked extension to dist/
```

Load it in Chrome: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select `dist/`. Clicking the toolbar icon opens the
extension as a side panel, which stays open while you work in GraphiQL.

`npm run dev` starts Vite in watch mode if you're iterating on the panel UI.

### How it works

- `src/content-main.js` runs in the **page's own JS world** (`"world": "MAIN"`
  in the manifest) because GraphiQL's CodeMirror editor instances are only
  reachable there — they're not visible to a normal ("isolated world")
  content script, which shares the DOM but not page-attached JS properties.
- `src/content-isolated.js` runs in the normal isolated world (so it has
  `chrome.runtime` access) and relays messages between the extension side panel
  and `content-main.js` over `window.postMessage`.
- `src/background.js` just makes the toolbar icon open the side panel.
- `src/App.jsx` is the side panel UI (React + Tailwind), storing saved queries in
  IndexedDB via `src/db.js`.

## Releasing

`main` is the default development branch. Changes land through pull
requests: a repository ruleset requires one approving review (repository
admins can bypass it when merging a PR) and blocks force-pushes and
deletion. Every push and PR runs CI — `npm test` then `npm run build`
(`.github/workflows/ci.yml`).

`master` is the release branch. Pushing to it (e.g. merging `main` into
`master`) builds the extension, tags the commit with the version from
`manifest.json`, zips it, and attaches it to a GitHub Release
(`.github/workflows/release.yml`):

```bash
# bump "version" in manifest.json first (it's the only version field), then:
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

1. In the dashboard's **Account** page, set the publisher contact email and
   verify it — publishing is blocked until you do.
2. `npm run build`, then zip the **contents** of `dist/` (not the folder
   itself — `manifest.json` needs to be at the zip root):
   ```bash
   cd dist && zip -qrX ../query-saver-for-hasura-v$(node -p "require('../manifest.json').version").zip . && cd ..
   ```
3. In the Developer Dashboard, create a new item and upload that zip. The
   manifest `description` doubles as the store summary and must be
   ≤ 132 characters.
4. Fill in the **Store listing**:
   - Category: *Developer Tools*; language: *English*.
   - Store icon: `store/store-icon-128.png` (96×96 artwork with 16px
     transparent padding, per Google's guidelines).
   - Screenshots: 1–5, exactly **1280×800** or **640×400**, JPEG or PNG
     **without alpha** (macOS screenshots have alpha — convert them, e.g.
     `sips -s format jpeg in.png --out out.jpg`). Don't show internal
     endpoints or schemas; they'll be public.
   - Small promo tile: 440×280.
5. Fill in the **Privacy practices** tab: single purpose; permission
   justifications (`scripting` re-injects the bundled content scripts into
   already-open GraphiQL tabs, `sidePanel` hosts the UI, host access is
   limited to `cloud.hasura.io`); no remote code; data usage —
   *Authentication information* and *Website content* (stored on-device
   only); all three certifications; privacy policy URL
   `https://github.com/tanishq-khandelwal/hasura-query-saver/blob/main/PRIVACY_POLICY.md`.
6. Save draft, then submit for review.

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
   - `CWS_EXTENSION_ID` — from the dashboard, once the first submission exists
   - `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` — from steps
     3–5

From then on, bumping `manifest.json`'s version and pushing to `master`
builds and uploads a draft update automatically; publishing it live is a
manual, deliberate step.
