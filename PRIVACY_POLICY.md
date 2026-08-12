# Privacy Policy — Hasura Query Saver

**Last updated:** 2026-08-12

Hasura Query Saver is a browser extension for saving, autofilling, and sharing
GraphQL queries, variables, and headers on Hasura's public GraphiQL console
(`https://cloud.hasura.io/public/graphiql`).

## What this extension does

- Reads and writes the query, variables, and request-header fields on
  `cloud.hasura.io/public/graphiql*` pages, so you can save and re-apply them.
- Stores everything you save (query text, variables, header names/values —
  including any tokens or secrets you choose to save as headers) in your
  browser's local IndexedDB storage, on your own device.
- Lets you export your saved queries to a JSON file, and import a JSON file
  back in, entirely under your control.

## What this extension does not do

- It does not send any data to any server. There is no backend for this
  extension — all storage is local, in your browser.
- It does not collect analytics, telemetry, or usage data of any kind.
- It does not access any site other than `cloud.hasura.io/public/graphiql*`.

## Data you export

If you use the Export feature, the resulting JSON file contains whatever you
saved, in plain text — including any header values (such as admin secrets or
auth tokens) you chose to save. Treat exported files with the same care you'd
give any file containing credentials, and only share them with people you
trust.

## Uninstalling

Removing the extension deletes its local IndexedDB storage along with it,
except for any files you separately exported.

## Contact

Questions about this policy can be opened as an issue on the project's
GitHub repository.
