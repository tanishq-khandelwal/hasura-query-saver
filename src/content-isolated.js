// Runs in the extension's isolated world (has chrome.runtime access, unlike
// the MAIN world). Relays GET_STATE/SET_STATE requests from the popup to
// content-main.js — which runs in the page's own world, where GraphiQL's
// CodeMirror instances actually live — over window.postMessage, then relays
// the response back through chrome.runtime.

let counter = 0;

function callMainWorld(type, payload) {
  return new Promise((resolve) => {
    const id = `hqs-${Date.now()}-${counter++}`;

    function onMessage(event) {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || msg.source !== "hqs-response" || msg.id !== id) return;
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      resolve(msg.ok ? { ok: true, ...msg.result } : { ok: false, error: msg.error });
    }

    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve({ ok: false, error: "Timed out waiting for the page script to respond." });
    }, 5000);

    window.addEventListener("message", onMessage);
    window.postMessage({ source: "hqs-request", id, type, payload }, "*");
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_STATE" || msg.type === "SET_STATE") {
    callMainWorld(msg.type, msg.payload).then(sendResponse);
    return true; // async response
  }
});
