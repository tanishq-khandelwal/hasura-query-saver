# Privacy Policy — Query Saver for Hasura GraphiQL

**Last updated:** 2026-09-29

Query Saver for Hasura GraphiQL is a browser extension for saving,
re-applying, and sharing GraphQL queries, variables, and headers on Hasura's
public GraphiQL console (`https://cloud.hasura.io/public/graphiql`). It is an
unofficial tool and is not affiliated with or endorsed by Hasura.

## What this extension does

- Reads and writes the query, variables, and request-header fields on
  `cloud.hasura.io/public/graphiql*` pages, so you can save and re-apply them.
- Stores everything you save (query text, variables, header names/values —
  including any tokens or secrets you choose to save as headers) in your
  browser's local IndexedDB storage, on your own device.
- Before applying a saved query, it saves a copy of what's currently in the
  GraphiQL editor to that same local storage, so your unsaved work isn't lost.
- Lets you export your saved queries to a JSON file, and import a JSON file
  back in, entirely under your control.

## What this extension does not do

- It does not send any data to any server. There is no backend for this
  extension — all storage is local, in your browser.
- It does not collect analytics, telemetry, or usage data of any kind.
- It does not access any site other than `cloud.hasura.io/public/graphiql*`.

## Permissions

- `scripting` — to connect to GraphiQL tabs that were already open when the
  extension was installed or updated.
- `sidePanel` — the extension's interface is shown in the browser side panel.
- Host access to `cloud.hasura.io` — to read and write the GraphiQL editor
  and request-headers table. No other site is accessed.

## Data you export

By default, exported files have all header values blanked, so admin secrets
and auth tokens are not included. If you explicitly choose "Export with
header values", the file contains those values in plain text — treat it like
any file containing credentials, and only share it with people you trust.

## Uninstalling

Removing the extension deletes its local IndexedDB storage along with it,
except for any files you separately exported.

## Contact

Questions about this policy can be opened as an issue on the project's
GitHub repository: https://github.com/tanishq-khandelwal/hasura-query-saver/issues
