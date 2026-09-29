import { useCallback, useEffect, useRef, useState } from "react";
import { dbAdd, dbAddMany, dbDelete, dbGetAll, dbPut } from "./db.js";
import { GRAPHIQL_URL, getHasuraTab, getState, setState } from "./hasura.js";
import { itemKey, matchesSearch, normalizeHeaders, normalizeItem, operationInfo, toExport } from "./items.js";
import {
  Button,
  CodeInput,
  CodeSection,
  HeadersEditor,
  HeadersSection,
  Icon,
  OpBadge,
  Section,
  TextInput,
  Toast,
  timeAgo,
} from "./components.jsx";
import logoUrl from "../icons/logo64.png";

const BLANK_FORM = { id: null, name: "", query: "", variables: "", headers: [] };

function isInvalidJson(text) {
  if (!text.trim()) return false;
  try {
    JSON.parse(text);
    return false;
  } catch {
    return true;
  }
}

export default function App() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "new" | "edit"
  const [form, setForm] = useState(BLANK_FORM);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(null);
  const [busy, setBusy] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const fileRef = useRef(null);

  const reload = useCallback(async () => {
    setItems((await dbGetAll()).sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Keep the header's connection pill in sync as tabs open, close, and switch.
  useEffect(() => {
    const refresh = () => getHasuraTab().then(setTab, () => setTab(null));
    refresh();
    const events = [chrome.tabs.onActivated, chrome.tabs.onUpdated, chrome.tabs.onRemoved];
    events.forEach((e) => e.addListener(refresh));
    return () => events.forEach((e) => e.removeListener(refresh));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.action ? 8000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // "/" jumps to search from anywhere outside a text field.
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "/" || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const notify = (text, tone = "info", action = null) => setToast({ text, tone, action });

  async function run(key, fn) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      notify(err?.message || String(err), "error");
    } finally {
      setBusy(null);
    }
  }

  const selected = mode === "view" ? items.find((i) => i.id === selectedId) || null : null;
  const q = search.trim().toLowerCase();
  const visibleItems = items.filter((i) => matchesSearch(i, q));
  // Narrow panel: one pane at a time. Wide (md+): list and detail side by side.
  const showingMain = mode !== "view" || selected;

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

  async function readTab() {
    const t = await getHasuraTab();
    if (!t) {
      notify("Open a Hasura GraphiQL tab first.", "error");
      return null;
    }
    const state = await getState(t.id);
    if (!state?.ok) {
      notify(`Couldn't read "${t.title}": ${state?.error || "unknown error"}`, "error");
      return null;
    }
    return state;
  }

  // One click: snapshot whatever is in GraphiQL right now as a new saved query.
  const handleCapture = () =>
    run("capture", async () => {
      const state = await readTab();
      if (!state) return;
      if (!state.query.trim()) return notify("The GraphiQL query editor is empty.", "error");
      const name = operationInfo(state.query).name || `Untitled · ${new Date().toLocaleString()}`;
      const id = await dbAdd(normalizeItem({ ...state, name }));
      await reload();
      setMode("view");
      setSelectedId(id);
      notify(`Saved "${name}".`, "success", {
        label: "Rename",
        run: async () => startEdit((await dbGetAll()).find((i) => i.id === id)),
      });
    });

  const handleFetchIntoForm = () =>
    run("fetch", async () => {
      const state = await readTab();
      if (!state) return;
      setForm((f) => ({
        ...f,
        name: f.name || operationInfo(state.query).name,
        query: state.query,
        variables: state.variables,
        headers: state.headers,
      }));
      notify("Pulled in the current query, variables, and headers.", "success");
    });

  async function handleSaveForm(e) {
    e.preventDefault();
    const name = form.name.trim() || operationInfo(form.query).name;
    if (!name) return notify("Give this query a name first.", "error");
    const now = Date.now();
    const record = { name, query: form.query, variables: form.variables, headers: normalizeHeaders(form.headers) };
    let id = form.id;

    if (id != null) {
      const existing = items.find((i) => i.id === id);
      await dbPut({ ...record, id, createdAt: existing?.createdAt ?? now, updatedAt: now });
    } else {
      id = await dbAdd({ ...record, createdAt: now, updatedAt: now });
    }

    await reload();
    setMode("view");
    setSelectedId(id);
    notify(`Saved "${name}".`, "success");
  }

  function handleFormKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    } else if (e.key === "Escape") {
      cancelForm();
    }
  }

  const handleApply = (item) =>
    run(`apply-${item.id}`, async () => {
      const t = await getHasuraTab();
      if (!t) return notify("Open a Hasura GraphiQL tab first.", "error");

      // Apply overwrites the editor — and losing unsaved work there is exactly
      // what this extension exists to prevent. Snapshot it first unless it's
      // already one of the saved queries.
      const current = await getState(t.id);
      let snapshotName = null;
      if (
        current?.ok &&
        current.query.trim() &&
        !items.some((i) => i.query === current.query && i.variables === current.variables)
      ) {
        snapshotName = `Auto-saved · ${new Date().toLocaleString()}`;
        await dbAdd(normalizeItem({ ...current, name: snapshotName }));
        await reload();
      }

      const result = await setState(t.id, { query: item.query, variables: item.variables, headers: item.headers });
      if (!result?.ok) return notify(`Apply failed on "${t.title}": ${result?.error || "unknown error"}`, "error");

      notify(
        snapshotName ? `Applied "${item.name}". Previous editor contents saved as "${snapshotName}".` : `Applied "${item.name}".`,
        "success",
        snapshotName && {
          label: "Restore",
          run: () =>
            run("restore", async () => {
              const r = await setState(t.id, current);
              notify(r?.ok ? "Restored the previous editor contents." : `Restore failed: ${r?.error}`, r?.ok ? "success" : "error");
            }),
        }
      );
    });

  const handleDuplicate = (item) =>
    run("duplicate", async () => {
      const now = Date.now();
      const { id: _id, ...rest } = item;
      const id = await dbAdd({ ...rest, name: `${item.name} (copy)`, createdAt: now, updatedAt: now });
      await reload();
      setSelectedId(id);
      notify(`Duplicated "${item.name}".`, "success");
    });

  const handleDelete = (item) =>
    run("delete", async () => {
      await dbDelete(item.id);
      setSelectedId(null);
      await reload();
      notify(`Deleted "${item.name}".`, "info", {
        label: "Undo",
        run: async () => {
          await dbPut(item);
          await reload();
          setMode("view");
          setSelectedId(item.id);
        },
      });
    });

  async function handleExport(includeHeaderValues) {
    const all = await dbGetAll();
    const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), items: toExport(all, includeHeaderValues) }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hasura-queries-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(
      includeHeaderValues
        ? `Exported ${all.length} queries, including header values — share carefully.`
        : `Exported ${all.length} queries (header values blanked).`,
      "success"
    );
  }

  const handleImport = (e) =>
    run("import", async () => {
      const file = e.target.files[0];
      // Reset first, so picking the same file again (e.g. after fixing it) still fires onChange.
      e.target.value = "";
      if (!file) return;

      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        return notify("That file isn't valid JSON.", "error");
      }
      const incoming = Array.isArray(parsed) ? parsed : parsed?.items;
      if (!Array.isArray(incoming)) return notify("Unrecognized file format — expected an exported queries file.", "error");

      const seen = new Set((await dbGetAll()).map(itemKey));
      const now = Date.now();
      const fresh = [];
      for (const raw of incoming) {
        const rec = normalizeItem(raw, now);
        if (seen.has(itemKey(rec))) continue;
        seen.add(itemKey(rec));
        fresh.push(rec);
      }
      await dbAddMany(fresh);
      await reload();
      const skipped = incoming.length - fresh.length;
      notify(`Imported ${fresh.length} ${fresh.length === 1 ? "query" : "queries"}${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`, "success");
    });

  const fromMenu = (fn) => () => {
    setMenuOpen(false);
    fn();
  };

  function focusTab() {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  }

  return (
    <div className="flex h-screen min-w-0 flex-col bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center gap-2.5 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">Query Saver for Hasura</div>
          {tab ? (
            <button
              onClick={focusTab}
              title={`Go to "${tab.title}"`}
              className="flex max-w-full items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="truncate">Connected to GraphiQL</span>
            </button>
          ) : (
            <button
              onClick={() => chrome.tabs.create({ url: GRAPHIQL_URL })}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400"
            >
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              No GraphiQL tab · <span className="underline underline-offset-2">open one</span>
            </button>
          )}
        </div>
        <Button variant="ghost" title="New query" onClick={startNew} className="!px-2">
          <Icon name="plus" />
        </Button>
        <div className="relative">
          <Button variant="ghost" title="Import / export" onClick={() => setMenuOpen((o) => !o)} className="!px-2">
            <Icon name="more" />
          </Button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <MenuItem icon="upload" onClick={fromMenu(() => fileRef.current.click())} title="Import from file…" hint="Duplicates are skipped" />
                <MenuItem icon="download" onClick={fromMenu(() => handleExport(false))} title="Export" hint="Header values are blanked — safe to share" />
                <MenuItem
                  icon="download"
                  onClick={fromMenu(() => handleExport(true))}
                  title="Export with header values"
                  hint="Includes admin secrets and tokens"
                  warn
                />
              </div>
            </>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${showingMain ? "hidden md:flex" : "flex"} w-full flex-shrink-0 flex-col bg-white dark:bg-zinc-900 md:w-80 md:border-r md:border-zinc-200 md:dark:border-zinc-800`}
        >
          <div className="space-y-2 p-3">
            <Button variant="primary" className="w-full !py-2" onClick={handleCapture} disabled={busy === "capture"}>
              <Icon name={busy === "capture" ? "spinner" : "download"} />
              Save current GraphiQL query
            </Button>
            <div className="relative">
              <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <TextInput
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                placeholder="Search names, queries, headers…"
                className="w-full !pl-8 !pr-8"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-200 px-1.5 font-sans text-[10px] text-zinc-400 dark:border-zinc-700">
                /
              </kbd>
            </div>
          </div>

          <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {items.length === 0 && (
              <li className="flex flex-col items-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                  <Icon name="download" size={22} />
                </div>
                <p className="text-sm font-medium">No saved queries yet</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Write a query in GraphiQL, then hit <b>Save current GraphiQL query</b> — or import a file from the ⋯ menu.
                </p>
              </li>
            )}
            {items.length > 0 && visibleItems.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No matches for "{search}".</li>
            )}
            {visibleItems.map((item) => {
              const active = mode === "view" && item.id === selectedId;
              const n = item.headers?.length || 0;
              const applying = busy === `apply-${item.id}`;
              return (
                <li key={item.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => selectItem(item)}
                    onKeyDown={(e) => e.key === "Enter" && selectItem(item)}
                    className={`group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none transition focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                      active ? "bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:ring-violet-500/30" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
                    }`}
                  >
                    <OpBadge query={item.query} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {n ? `${n} header${n === 1 ? "" : "s"} · ` : ""}
                        {timeAgo(item.updatedAt)}
                      </div>
                    </div>
                    <button
                      title="Apply to GraphiQL"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(item);
                      }}
                      className={`rounded-md p-1.5 text-zinc-400 transition hover:bg-white hover:text-violet-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-zinc-900 dark:hover:text-violet-400 ${
                        applying ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <Icon name={applying ? "spinner" : "play"} size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {items.length > 0 && (
            <div className="border-t border-zinc-100 px-3 py-1.5 text-[11px] text-zinc-400 dark:border-zinc-800">
              {q ? `${visibleItems.length} of ${items.length}` : items.length} saved {items.length === 1 ? "query" : "queries"}
            </div>
          )}
        </aside>

        <main className={`${showingMain ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col overflow-y-auto`}>
          {mode === "new" || mode === "edit" ? (
            <form onSubmit={handleSaveForm} onKeyDown={handleFormKey} className="flex flex-1 flex-col">
              <div className="sticky top-0 z-[5] flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/90 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
                <Button variant="ghost" onClick={cancelForm} title="Cancel (Esc)" className="!px-1.5">
                  <Icon name="back" />
                </Button>
                <h2 className="flex-1 text-sm font-semibold">{mode === "new" ? "New query" : "Edit query"}</h2>
                <Button type="submit" variant="primary" title="Save (⌘S)">
                  <Icon name="check" size={14} /> Save
                </Button>
              </div>

              <div className="p-4">
                <Section title="Name">
                  <TextInput
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={operationInfo(form.query).name || "e.g. Active users by org"}
                    className="w-full font-medium"
                  />
                </Section>
                <Section
                  title="Query"
                  action={
                    <Button variant="ghost" onClick={handleFetchIntoForm} disabled={busy === "fetch"} className="!px-2 !py-1 text-xs">
                      <Icon name={busy === "fetch" ? "spinner" : "download"} size={13} /> Fetch from GraphiQL
                    </Button>
                  }
                >
                  <CodeInput
                    value={form.query}
                    onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                    placeholder="query MyQuery { ... }"
                    rows={10}
                  />
                </Section>
                <Section
                  title="Variables"
                  action={isInvalidJson(form.variables) && <span className="text-xs text-amber-600 dark:text-amber-400">Not valid JSON</span>}
                >
                  <CodeInput
                    value={form.variables}
                    onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value }))}
                    placeholder="{ }"
                    rows={4}
                  />
                </Section>
                <Section title="Headers">
                  <HeadersEditor headers={form.headers} onChange={(headers) => setForm((f) => ({ ...f, headers }))} />
                </Section>
                <p className="text-[11px] text-zinc-400">⌘S to save · Esc to cancel</p>
              </div>
            </form>
          ) : !selected ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <img src={logoUrl} alt="" className="mb-4 h-12 w-12 rounded-xl opacity-80" />
              <p className="text-sm font-medium">Pick a saved query</p>
              <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">Or save what's in GraphiQL right now with one click.</p>
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-[5] border-b border-zinc-200 bg-zinc-50/90 px-3 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setSelectedId(null)} title="Back" className="!px-1.5 md:hidden">
                    <Icon name="back" />
                  </Button>
                  <OpBadge query={selected.query} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold" title={selected.name}>
                      {selected.name}
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Updated {timeAgo(selected.updatedAt)}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Button variant="primary" onClick={() => handleApply(selected)} disabled={busy === `apply-${selected.id}`}>
                    <Icon name={busy === `apply-${selected.id}` ? "spinner" : "play"} size={14} /> Apply to GraphiQL
                  </Button>
                  <Button onClick={() => startEdit(selected)} title="Edit">
                    <Icon name="pencil" size={14} /> Edit
                  </Button>
                  <Button onClick={() => handleDuplicate(selected)} title="Duplicate" className="!px-2">
                    <Icon name="copy" size={14} />
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(selected)} title="Delete" className="ml-auto !px-2">
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <CodeSection title="Query" text={selected.query} language="graphql" />
                <CodeSection title="Variables" text={selected.variables} language="json" />
                <HeadersSection key={selected.id} headers={selected.headers} />
              </div>
            </>
          )}
        </main>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function MenuItem({ icon, title, hint, warn, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <Icon name={icon} className={`mt-0.5 ${warn ? "text-amber-500" : "text-zinc-400"}`} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className={`block text-xs ${warn ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"}`}>{hint}</span>
      </span>
    </button>
  );
}
