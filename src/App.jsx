import { useCallback, useEffect, useState } from "react";
import { dbAdd, dbDelete, dbGetAll, dbPut } from "./db.js";
import { getHasuraTab, getState, setState } from "./hasura.js";
import { Section, CodeSection, HeadersTable, HeadersEditor } from "./components.jsx";
import logoUrl from "../icons/logo64.png";

const BLANK_FORM = { id: null, name: "", query: "", variables: "", headers: [] };

export default function App() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "new" | "edit"
  const [form, setForm] = useState(BLANK_FORM);
  const [banner, setBanner] = useState("");
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    const all = (await dbGetAll()).sort((a, b) => b.updatedAt - a.updatedAt);
    setItems(all);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(""), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  const selected = mode === "view" ? items.find((i) => i.id === selectedId) || null : null;
  const query = search.trim().toLowerCase();
  const visibleItems = query
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.query?.toLowerCase().includes(query) ||
          i.headers?.some((h) => h.key.toLowerCase().includes(query))
      )
    : items;

  function startNew() {
    setForm(BLANK_FORM);
    setSelectedId(null);
    setMode("new");
  }

  function startEdit(item) {
    setForm({
      id: item.id,
      name: item.name,
      query: item.query,
      variables: item.variables,
      headers: item.headers || [],
    });
    setMode("edit");
  }

  function cancelForm() {
    setMode("view");
    setSelectedId(form.id ?? null);
  }

  function selectItem(item) {
    setMode("view");
    setSelectedId(item.id);
  }

  async function handleFetchFromTab() {
    const tab = await getHasuraTab();
    if (!tab) return setBanner("No Hasura GraphiQL tab open — open one first.");
    const state = await getState(tab.id);
    if (!state?.ok) {
      return setBanner(
        `Couldn't read tab "${tab.title}": ${state?.error || "unknown error"}`
      );
    }
    setForm((f) => ({ ...f, query: state.query, variables: state.variables, headers: state.headers }));
    setBanner("Pulled in the current query, variables, and headers.");
  }

  async function handleSaveForm(e) {
    e.preventDefault();
    const trimmed = form.name.trim();
    if (!trimmed) return setBanner("Enter a name first.");
    const now = Date.now();
    const headers = form.headers.filter((h) => h.key.trim() !== "");
    let id = form.id;

    if (id != null) {
      const existing = items.find((i) => i.id === id);
      await dbPut({
        id,
        name: trimmed,
        query: form.query,
        variables: form.variables,
        headers,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    } else {
      id = await dbAdd({
        name: trimmed,
        query: form.query,
        variables: form.variables,
        headers,
        createdAt: now,
        updatedAt: now,
      });
    }

    setMode("view");
    setSelectedId(id);
    setBanner(`Saved "${trimmed}".`);
    reload();
  }

  async function handleApply(item) {
    const tab = await getHasuraTab();
    if (!tab) return setBanner("No Hasura GraphiQL tab open — open one first.");
    const result = await setState(tab.id, {
      query: item.query,
      variables: item.variables,
      headers: item.headers,
    });
    if (!result?.ok) {
      return setBanner(
        `Apply failed on tab "${tab.title}": ${result?.error || "unknown error"}`
      );
    }
    setBanner(`Applied "${item.name}" to GraphiQL.`);
  }

  async function handleDelete(id) {
    await dbDelete(id);
    if (selectedId === id) setSelectedId(null);
    reload();
  }

  async function handleExport() {
    const all = await dbGetAll();
    const blob = new Blob(
      [JSON.stringify({ exportedAt: Date.now(), items: all }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hasura-queries-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setBanner("Invalid JSON file.");
      return;
    }

    const incoming = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(incoming)) {
      setBanner("Unrecognized file format.");
      return;
    }

    const now = Date.now();
    for (const item of incoming) {
      await dbAdd({
        name: item.name || "Imported query",
        query: item.query || "",
        variables: item.variables || "",
        headers: item.headers || [],
        createdAt: now,
        updatedAt: now,
      });
    }
    e.target.value = "";
    setBanner(`Imported ${incoming.length} item(s).`);
    reload();
  }

  return (
    <div className="flex h-[600px] w-[780px] flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2.5 font-semibold">
          <img src={logoUrl} alt="" className="h-7 w-7 rounded-md" />
          <span>Hasura Query Saver</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Export
          </button>
          <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>
      </header>

      {banner && (
        <div className="border-b border-zinc-200 bg-violet-50 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-violet-950/40 dark:text-zinc-200">
          {banner}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 flex-shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
            <button
              onClick={startNew}
              className="w-full rounded-md bg-gradient-to-br from-violet-500 to-pink-500 px-3 py-1.5 text-sm font-medium text-white hover:brightness-105"
            >
              + New query
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved queries…"
              className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-sm outline-none focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <ul className="flex-1 overflow-y-auto p-1.5">
            {items.length === 0 && (
              <li className="px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                No saved queries yet.
              </li>
            )}
            {items.length > 0 && visibleItems.length === 0 && (
              <li className="px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                No matches for "{search}".
              </li>
            )}
            {visibleItems.map((item) => (
              <li
                key={item.id}
                onClick={() => selectItem(item)}
                className={`cursor-pointer rounded-lg px-3 py-2 ${
                  mode === "view" && item.id === selectedId
                    ? "bg-violet-100 dark:bg-violet-900/40"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {item.headers?.length || 0} header(s) ·{" "}
                  {new Date(item.updatedAt).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {mode === "new" || mode === "edit" ? (
            <form onSubmit={handleSaveForm}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Name this query…"
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium outline-none focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950"
                />
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={handleFetchFromTab}
                    className="whitespace-nowrap rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Fetch from GraphiQL tab
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="whitespace-nowrap rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-md bg-gradient-to-br from-violet-500 to-pink-500 px-3.5 py-1.5 text-sm font-medium text-white hover:brightness-105"
                  >
                    Save
                  </button>
                </div>
              </div>

              <Section title="Query">
                <textarea
                  value={form.query}
                  onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                  placeholder="query MyQuery { ... }"
                  rows={6}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-100 p-3 font-mono text-xs outline-none focus:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </Section>
              <Section title="Variables">
                <textarea
                  value={form.variables}
                  onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value }))}
                  placeholder="{ }"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-100 p-3 font-mono text-xs outline-none focus:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </Section>
              <Section title="Headers">
                <HeadersEditor
                  headers={form.headers}
                  onChange={(headers) => setForm((f) => ({ ...f, headers }))}
                />
              </Section>
            </form>
          ) : !selected ? (
            <p className="mt-10 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              Select a saved query, or click "New query" to create one.
            </p>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="break-all text-lg font-semibold">{selected.name}</h2>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => handleApply(selected)}
                    className="rounded-md bg-gradient-to-br from-violet-500 to-pink-500 px-3.5 py-1.5 text-sm font-medium text-white hover:brightness-105"
                  >
                    Apply to GraphiQL
                  </button>
                  <button
                    onClick={() => startEdit(selected)}
                    className="rounded-md border border-zinc-300 px-3.5 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="rounded-md border border-red-300 px-3.5 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <CodeSection title="Query" text={selected.query} language="graphql" />
              <CodeSection title="Variables" text={selected.variables} language="json" />
              <Section title="Headers">
                <HeadersTable headers={selected.headers} />
              </Section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
