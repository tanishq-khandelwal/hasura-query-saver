import { forwardRef, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-graphql";
import "prismjs/components/prism-json";
import { operationInfo } from "./items.js";

const ICONS = {
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35",
  play: "M7 4.5v15l12-7.5z",
  pencil: "M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  trash: "M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 5v5m4-5v5",
  check: "M20 6 9 17l-5-5",
  more: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  back: "M19 12H5m7 7-7-7 7-7",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff:
    "m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6",
  download: "M12 3v12m-5-5 5 5 5-5M5 21h14",
  upload: "M12 16V4m-5 5 5-5 5 5M5 21h14",
  x: "M18 6 6 18M6 6l12 12",
  alert: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6v-4m0-4h.01",
  spinner: "M21 12a9 9 0 1 1-6.2-8.56",
};

export function Icon({ name, size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`flex-shrink-0 ${name === "spinner" ? "animate-spin" : ""} ${className}`}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-sm shadow-violet-500/20 hover:brightness-110",
  secondary:
    "border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
  ghost: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
  danger: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50",
};

export function Button({ variant = "secondary", className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:pointer-events-none disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

const OP_STYLES = {
  query: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  mutation: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  subscription: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function OpBadge({ query }) {
  const { type } = operationInfo(query);
  return (
    <span
      title={type}
      className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold uppercase ${OP_STYLES[type]}`}
    >
      {type[0]}
    </span>
  );
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(ts) {
  const s = (ts - Date.now()) / 1000;
  for (const [unit, sec] of UNITS) {
    if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit);
  }
  return "just now";
}

export function Section({ title, action, children }) {
  return (
    <section className="mb-5">
      <div className="mb-1.5 flex min-h-[26px] items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</h3>
        {action}
      </div>
      {children}
    </section>
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
    <Section
      title={title}
      action={
        hasText && (
          <Button variant="ghost" onClick={handleCopy} title="Copy to clipboard" className="!px-2 !py-1 text-xs">
            <Icon name={copied ? "check" : "copy"} size={13} />
            {copied ? "Copied" : "Copy"}
          </Button>
        )
      }
    >
      <pre className="code-block max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs leading-relaxed dark:border-zinc-800 dark:bg-zinc-900">
        {html ? <code dangerouslySetInnerHTML={{ __html: html }} /> : <span className="text-zinc-400 dark:text-zinc-500">Empty</span>}
      </pre>
    </Section>
  );
}

// Values are masked by default — they're usually admin secrets or bearer tokens.
export function HeadersSection({ headers }) {
  const [reveal, setReveal] = useState(false);
  const has = headers && headers.length > 0;
  return (
    <Section
      title={`Headers${has ? ` · ${headers.length}` : ""}`}
      action={
        has && (
          <Button variant="ghost" onClick={() => setReveal((r) => !r)} className="!px-2 !py-1 text-xs">
            <Icon name={reveal ? "eyeOff" : "eye"} size={13} />
            {reveal ? "Hide values" : "Show values"}
          </Button>
        )
      }
    >
      {!has ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          No headers saved.
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white font-mono text-xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {headers.map((h, i) => (
            <div
              key={i}
              className={`flex gap-3 px-3 py-2 ${h.enabled === false ? "text-zinc-400 line-through dark:text-zinc-600" : ""}`}
              title={h.enabled === false ? "Disabled" : undefined}
            >
              <span className="w-2/5 flex-shrink-0 break-all font-medium">{h.key}</span>
              <span className="min-w-0 flex-1 break-all text-zinc-500 dark:text-zinc-400">
                {!h.value ? "—" : reveal ? h.value : "••••••••"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

const INPUT =
  "rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500";

export const TextInput = forwardRef(function TextInput({ className = "", ...props }, ref) {
  return <input ref={ref} className={`${INPUT} text-sm ${className}`} {...props} />;
});

export function CodeInput({ className = "", ...props }) {
  return <textarea spellCheck={false} className={`${INPUT} w-full resize-y p-3 font-mono text-xs leading-relaxed ${className}`} {...props} />;
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
            className="h-3.5 w-3.5 flex-shrink-0 accent-violet-600"
          />
          <TextInput
            value={h.key}
            onChange={(e) => updateRow(i, { key: e.target.value })}
            placeholder="Key"
            className="w-2/5 min-w-0 !px-2 !py-1 font-mono !text-xs"
          />
          <TextInput
            value={h.value}
            onChange={(e) => updateRow(i, { value: e.target.value })}
            placeholder="Value"
            className="min-w-0 flex-1 !px-2 !py-1 font-mono !text-xs"
          />
          <Button variant="ghost" onClick={() => removeRow(i)} title="Remove header" className="!p-1 hover:!text-red-500">
            <Icon name="x" size={14} />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 transition hover:border-violet-400 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-violet-400"
      >
        <Icon name="plus" size={13} /> Add header
      </button>
    </div>
  );
}

const TOAST_TONES = {
  info: ["info", "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"],
  success: ["check", "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"],
  error: ["alert", "bg-red-600 text-white"],
};

export function Toast({ toast, onClose }) {
  const [icon, tone] = TOAST_TONES[toast.tone] || TOAST_TONES.info;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3">
      <div role="status" className={`toast-in pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm shadow-xl ${tone}`}>
        <Icon name={icon} className={`mt-0.5 ${toast.tone === "success" ? "text-emerald-400 dark:text-emerald-600" : ""}`} />
        <span className="min-w-0 flex-1 break-words">{toast.text}</span>
        {toast.action && (
          <button
            type="button"
            className="font-semibold text-violet-300 hover:underline dark:text-violet-700"
            onClick={() => {
              onClose();
              toast.action.run();
            }}
          >
            {toast.action.label}
          </button>
        )}
        <button type="button" onClick={onClose} title="Dismiss" className="mt-0.5 opacity-60 hover:opacity-100">
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
