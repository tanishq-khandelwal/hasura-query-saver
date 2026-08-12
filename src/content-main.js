// Runs in the page's own MAIN world (not the extension's isolated world).
// This is required: GraphiQL's CodeMirror instances live as a page-world JS
// property (`element.CodeMirror`) that an isolated-world content script
// cannot see, even though it shares the same DOM nodes. content-isolated.js
// relays requests here over window.postMessage.

function getCMByMode(mode) {
  for (const node of document.querySelectorAll(".CodeMirror")) {
    const cm = node.CodeMirror;
    if (cm?.getOption?.("mode") === mode) return cm;
  }
  return null;
}

async function waitFor(fn, timeoutMs = 4000, intervalMs = 100) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = fn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

function setNativeValue(el, value) {
  if (!el) throw new Error("Header input not found in the Request Headers table.");
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function readHeaders() {
  const keyInputs = document.querySelectorAll(
    '.hasura-graphiql-table-input[placeholder="Enter Key"]'
  );
  return Array.from(keyInputs)
    .map((keyInput) => {
      const row = keyInput.closest("tr");
      const valueInput = row.querySelector(
        '.hasura-graphiql-table-input[placeholder="Enter Value"]'
      );
      const checkbox = row.querySelector(".hasura-graphiql-table-checkbox");
      return {
        key: keyInput.value,
        value: valueInput ? valueInput.value : "",
        enabled: checkbox ? checkbox.checked : true,
      };
    })
    .filter((h) => h.key.trim() !== "");
}

async function clearHeaderRows() {
  // Rows re-render after each delete, so re-query rather than snapshotting once.
  // Bounded so a DOM change we don't anticipate can't hang this forever.
  for (let guard = 0; guard < 200; guard++) {
    const filled = Array.from(
      document.querySelectorAll('.hasura-graphiql-table-input[placeholder="Enter Key"]')
    ).find((k) => k.value.trim() !== "");
    if (!filled) return;
    const cross = filled.closest("tr")?.querySelector(".hasura-graphiql-table-cell-cross i");
    if (!cross) return;
    cross.click();
    await new Promise((r) => setTimeout(r, 30));
  }
}

async function writeHeaders(headers) {
  await clearHeaderRows();
  for (const h of headers) {
    if (!h.key) continue;
    const keyInputs = document.querySelectorAll(
      '.hasura-graphiql-table-input[placeholder="Enter Key"]'
    );
    const lastKey = keyInputs[keyInputs.length - 1];
    if (!lastKey) throw new Error("Request Headers table row not found — is that section expanded?");
    setNativeValue(lastKey, h.key);
    const row = lastKey.closest("tr");
    setNativeValue(
      row?.querySelector('.hasura-graphiql-table-input[placeholder="Enter Value"]'),
      h.value || ""
    );
    await new Promise((r) => setTimeout(r, 30));
    if (h.enabled === false) {
      const checkbox = row?.querySelector(".hasura-graphiql-table-checkbox");
      if (checkbox && checkbox.checked) checkbox.click();
    }
  }
}

async function handleRequest(type, payload) {
  if (type === "GET_STATE") {
    const queryCM = await waitFor(() => getCMByMode("graphql"));
    if (!queryCM) throw new Error("Query editor not found on this page (it may not have mounted yet).");
    const varCM = getCMByMode("graphql-variables");
    return {
      query: queryCM.getValue(),
      variables: varCM ? varCM.getValue() : "",
      headers: readHeaders(),
    };
  }
  if (type === "SET_STATE") {
    const queryCM = await waitFor(() => getCMByMode("graphql"));
    if (!queryCM) throw new Error("Query editor not found on this page (it may not have mounted yet).");
    queryCM.setValue(payload.query || "");
    const varCM = getCMByMode("graphql-variables");
    if (varCM) varCM.setValue(payload.variables || "");
    await writeHeaders(payload.headers || []);
    return {};
  }
  throw new Error(`Unknown request type: ${type}`);
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== "hqs-request") return;

  handleRequest(msg.type, msg.payload)
    .then((result) => {
      window.postMessage({ source: "hqs-response", id: msg.id, ok: true, result }, "*");
    })
    .catch((err) => {
      window.postMessage({ source: "hqs-response", id: msg.id, ok: false, error: err.message }, "*");
    });
});
