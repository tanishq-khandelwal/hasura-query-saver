import { useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-graphql";
import "prismjs/components/prism-json";

export function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Query/Variables display: syntax-highlighted (GraphQL/JSON via Prism) with a copy button.
export function CodeSection({ title, text, language = "graphql" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const hasText = text && text.trim();
  const grammar = Prism.languages[language] || Prism.languages.graphql;
  const html = hasText ? Prism.highlight(text, grammar, language) : null;

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </h3>
        {hasText && (
          <button
            type="button"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        )}
      </div>
      <pre className="code-block max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-100 p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
        {html ? (
          <code dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">—</span>
        )}
      </pre>
    </div>
  );
}

export function HeadersEditor({ headers, onChange }) {
  function updateRow(i, patch) {
    onChange(headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }
  function removeRow(i) {
    onChange(headers.filter((_, idx) => idx !== i));
  }
  function addRow() {
    onChange([...headers, { key: "", value: "", enabled: true }]);
  }

  return (
    <div className="space-y-1.5">
      {headers.map((h, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={h.enabled !== false}
            onChange={(e) => updateRow(i, { enabled: e.target.checked })}
            title="Enabled"
          />
          <input
            value={h.key}
            onChange={(e) => updateRow(i, { key: e.target.value })}
            placeholder="Key"
            className="w-1/3 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            value={h.value}
            onChange={(e) => updateRow(i, { value: e.target.value })}
            placeholder="Value"
            className="flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="px-1.5 text-zinc-400 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="rounded-md border border-dashed border-zinc-300 px-2.5 py-1 text-xs text-zinc-500 hover:border-violet-400 hover:text-violet-500 dark:border-zinc-700 dark:text-zinc-400"
      >
        + Add header
      </button>
    </div>
  );
}

export function HeadersTable({ headers }) {
  if (!headers || !headers.length) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No headers saved.</p>;
  }
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          <th className="border-b border-zinc-200 px-2 py-1.5 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Key
          </th>
          <th className="border-b border-zinc-200 px-2 py-1.5 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {headers.map((h, i) => (
          <tr
            key={i}
            className={h.enabled === false ? "text-zinc-400 line-through dark:text-zinc-600" : ""}
          >
            <td className="border-b border-zinc-100 px-2 py-1.5 font-mono dark:border-zinc-900">
              {h.key}
            </td>
            <td className="border-b border-zinc-100 px-2 py-1.5 font-mono dark:border-zinc-900">
              {h.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
