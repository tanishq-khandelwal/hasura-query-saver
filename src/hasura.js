// Talks to the content script running on the Hasura GraphiQL tab.

export const GRAPHIQL_URL = "https://cloud.hasura.io/public/graphiql";
const GRAPHIQL_MATCH = `${GRAPHIQL_URL}*`;

export async function getHasuraTab() {
  const [active] = await chrome.tabs.query({ url: GRAPHIQL_MATCH, active: true, currentWindow: true });
  if (active) return active;
  const tabs = await chrome.tabs.query({ url: GRAPHIQL_MATCH });
  if (!tabs.length) return null;
  // If several matching tabs are open (stale/background ones included), the
  // one most recently interacted with is almost certainly the one meant.
  return [...tabs].sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
}

// If the tab was already open before this extension was loaded/updated, the
// content script never got auto-injected into it — re-inject it on demand
// instead of making the user manually refresh the tab.
async function ensureContentScript(tabId) {
  const contentScripts = chrome.runtime.getManifest().content_scripts || [];
  for (const cs of contentScripts) {
    if (!cs.js?.length) continue;
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: cs.js,
        world: cs.world === "MAIN" ? "MAIN" : "ISOLATED",
      });
    } catch {
      // Injection isn't possible (e.g. page navigated away) — the retry below will just fail too.
    }
  }
}

async function sendWithRetry(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await ensureContentScript(tabId);
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

export async function getState(tabId) {
  return sendWithRetry(tabId, { type: "GET_STATE" });
}

export async function setState(tabId, payload) {
  return sendWithRetry(tabId, { type: "SET_STATE", payload });
}
