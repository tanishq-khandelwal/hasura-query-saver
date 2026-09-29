// Pure helpers for saved-query records — no chrome/DOM APIs, so `npm test`
// can run them under plain Node.

export function normalizeHeaders(headers) {
  if (!Array.isArray(headers)) return [];
  return headers
    .filter((h) => h && typeof h === "object" && String(h.key ?? "").trim() !== "")
    .map((h) => ({
      key: String(h.key),
      value: h.value == null ? "" : String(h.value),
      enabled: h.enabled !== false,
    }));
}

// Coerces anything (an imported file entry, a GraphiQL snapshot) into a valid record.
export function normalizeItem(item, now = Date.now()) {
  const vars = item?.variables;
  return {
    name: typeof item?.name === "string" && item.name.trim() ? item.name.trim() : "Imported query",
    query: typeof item?.query === "string" ? item.query : "",
    variables: typeof vars === "string" ? vars : vars ? JSON.stringify(vars, null, 2) : "",
    headers: normalizeHeaders(item?.headers),
    createdAt: now,
    updatedAt: now,
  };
}

// Two records with the same name and query are treated as the same entry on import.
export const itemKey = (i) => `${i.name}\u0000${i.query}`;

export function operationInfo(query) {
  const m = /^\s*(?:#.*\n\s*)*(query|mutation|subscription)\b\s*([_A-Za-z][_0-9A-Za-z]*)?/.exec(query || "");
  return { type: m ? m[1] : "query", name: m?.[2] || "" };
}

export function matchesSearch(item, q) {
  if (!q) return true;
  return [item.name, item.query, item.variables, ...(item.headers || []).map((h) => h.key)].some(
    (s) => typeof s === "string" && s.toLowerCase().includes(q)
  );
}

// Header values are usually admin secrets / bearer tokens, so they're blanked
// unless the user explicitly opts in.
export function toExport(items, includeHeaderValues) {
  return items.map(({ id, ...rest }) =>
    includeHeaderValues
      ? rest
      : { ...rest, headers: normalizeHeaders(rest.headers).map((h) => ({ ...h, value: "" })) }
  );
}
