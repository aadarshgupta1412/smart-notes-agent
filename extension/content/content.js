chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SELECTION") {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : "";

    sendResponse({
      selectedText,
      pageTitle: document.title,
      pageUrl: window.location.href,
      favicon:
        document.querySelector('link[rel*="icon"]')?.href ||
        `${window.location.origin}/favicon.ico`,
      domain: window.location.hostname,
    });
  }
  return true;
});
