// The toolbar icon opens a side panel instead of a popup: it stays open while
// you click around GraphiQL, whereas a popup closes (dropping any unsaved
// draft) on the first click outside it.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
