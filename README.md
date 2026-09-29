# Query Saver for Hasura GraphiQL

Never lose your GraphiQL work again.

Hasura's public GraphiQL console doesn't remember your queries, variables, or
request headers between sessions. Query Saver keeps them for you, right in
your browser, and puts any of them back into GraphiQL with a single click.

> Unofficial community tool — not affiliated with or endorsed by Hasura.

## Features

- **One-click save** — capture the current query, variables, and headers
  from GraphiQL, automatically named after the operation.
- **One-click apply** — load any saved query back into GraphiQL. Whatever was
  in the editor is saved first, and a **Restore** action puts it back.
- **Side panel** — stays open next to GraphiQL while you work.
- **Search** across names, queries, variables, and header keys.
- **Edit, duplicate, and delete** — with undo for deletes.
- **Built for roles, secrets, and tokens** — save `x-hasura-role`,
  `x-hasura-admin-secret`, `Authorization`, or any other header with each
  query. Values stay hidden until you choose to show them.
- **Share with your team** — export to a JSON file and import a teammate's.
  Exports leave header values out by default so secrets don't leak;
  including them is a separate, clearly marked option. Duplicates are skipped
  on import.

## How to use

1. Open Hasura's public GraphiQL console and click the extension icon — the
   side panel opens and shows *Connected to GraphiQL*.
2. Write a query, then click **Save current GraphiQL query**.
3. Pick any saved query and click **Apply to GraphiQL**, or use the ▶ button
   that appears when you hover over it in the list.
4. Use the **⋯** menu to import or export.

**Keyboard shortcuts:** `/` search · `⌘S` / `Ctrl+S` save while editing ·
`Esc` cancel.

## Privacy

Everything is stored locally on your device. No accounts, no servers, no
analytics. The extension only runs on Hasura's public GraphiQL console. See
the [privacy policy](./PRIVACY_POLICY.md).
