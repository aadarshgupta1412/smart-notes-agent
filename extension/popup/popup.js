document.addEventListener("DOMContentLoaded", init);

let pageData = {};
let folders = [];

async function init() {
  const authData = await sendMessage({ type: "GET_AUTH" });

  if (authData?.token && authData?.user) {
    showMainScreen(authData.user);
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("main-screen").classList.add("hidden");

  document.getElementById("login-btn").addEventListener("click", async () => {
    const btn = document.getElementById("login-btn");
    btn.textContent = "Signing in...";
    btn.disabled = true;

    const result = await sendMessage({ type: "LOGIN" });

    if (result?.success) {
      showMainScreen(result.user);
    } else {
      btn.textContent = "Sign in with Google";
      btn.disabled = false;
      showStatus("Login failed. Please try again.", "error");
    }
  });
}

async function showMainScreen(user) {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("main-screen").classList.remove("hidden");
  document.getElementById("user-name").textContent = user.name || user.email || "User";

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await sendMessage({ type: "LOGOUT" });
    showLoginScreen();
  });

  await getPageData();
  await loadFolders();
  setupEventListeners();
}

async function getPageData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [response] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        selectedText: window.getSelection().toString().trim(),
        pageTitle: document.title,
        pageUrl: window.location.href,
        favicon:
          document.querySelector('link[rel*="icon"]')?.href ||
          `${window.location.origin}/favicon.ico`,
        domain: window.location.hostname,
      }),
    });

    pageData = response.result || {};
  } catch {
    pageData = { selectedText: "", pageTitle: "Unknown", pageUrl: "", domain: "" };
  }

  if (pageData.selectedText) {
    document.getElementById("content-preview").classList.remove("hidden");
    document.getElementById("bookmark-notice").classList.add("hidden");
    const preview = pageData.selectedText.slice(0, 300);
    document.getElementById("selected-text").textContent =
      preview + (pageData.selectedText.length > 300 ? "..." : "");
  } else {
    document.getElementById("content-preview").classList.add("hidden");
    document.getElementById("bookmark-notice").classList.remove("hidden");
  }

  document.getElementById("page-title").textContent = pageData.pageTitle || "Untitled";
  document.getElementById("page-url").textContent = pageData.pageUrl || "";
}

async function loadFolders() {
  const result = await sendMessage({
    type: "API_REQUEST",
    endpoint: "/folders",
  });

  if (result?.ok) {
    folders = result.data || [];
    const select = document.getElementById("folder-select");
    select.innerHTML = '<option value="">Select a folder...</option>';

    folders.forEach((folder) => {
      const option = document.createElement("option");
      option.value = folder.id;
      option.textContent = `${folder.name} (${folder.source_count || 0} items)`;
      select.appendChild(option);
    });

    select.innerHTML += '<option value="__new__">+ Create New Folder</option>';

    suggestFolder();
  }
}

function suggestFolder() {
  if (!folders.length || !pageData.pageTitle) return;

  const titleWords = pageData.pageTitle.toLowerCase().split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const folder of folders) {
    const folderWords = folder.name.toLowerCase().split(/\s+/);
    let score = 0;
    for (const tw of titleWords) {
      for (const fw of folderWords) {
        if (tw.length > 3 && fw.length > 3 && (tw.includes(fw) || fw.includes(tw))) {
          score++;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = folder;
    }
  }

  if (bestMatch && bestScore > 0) {
    document.getElementById("suggestion").classList.remove("hidden");
    document.getElementById("suggested-folder").textContent = bestMatch.name;
    document.getElementById("suggestion").addEventListener("click", () => {
      document.getElementById("folder-select").value = bestMatch.id;
      updateSaveButton();
    });
  }
}

function setupEventListeners() {
  const folderSelect = document.getElementById("folder-select");
  const newFolderToggle = document.getElementById("new-folder-toggle");
  const newFolderSection = document.getElementById("new-folder-section");
  const newFolderInput = document.getElementById("new-folder-input");
  const saveBtn = document.getElementById("save-btn");

  folderSelect.addEventListener("change", () => {
    if (folderSelect.value === "__new__") {
      newFolderSection.classList.remove("hidden");
      newFolderToggle.classList.add("hidden");
      newFolderInput.focus();
      folderSelect.value = "";
    }
    updateSaveButton();
  });

  newFolderToggle.addEventListener("click", () => {
    newFolderSection.classList.remove("hidden");
    newFolderToggle.classList.add("hidden");
    newFolderInput.focus();
  });

  newFolderInput.addEventListener("input", updateSaveButton);

  saveBtn.addEventListener("click", handleSave);
}

function updateSaveButton() {
  const folderId = document.getElementById("folder-select").value;
  const newName = document.getElementById("new-folder-input").value.trim();
  document.getElementById("save-btn").disabled = !folderId && !newName;
}

async function handleSave() {
  const saveBtn = document.getElementById("save-btn");
  const folderId = document.getElementById("folder-select").value;
  const newFolderName = document.getElementById("new-folder-input").value.trim();

  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;

  const payload = {
    folderId: folderId || undefined,
    newFolderName: !folderId && newFolderName ? newFolderName : undefined,
    source: {
      url: pageData.pageUrl,
      title: pageData.pageTitle,
      type: pageData.selectedText ? "highlight" : "bookmark",
    },
    content: pageData.selectedText || undefined,
    pageMetadata: {
      favicon: pageData.favicon,
      domain: pageData.domain,
    },
  };

  const result = await sendMessage({
    type: "API_REQUEST",
    endpoint: "/sources",
    options: {
      method: "POST",
      body: JSON.stringify(payload),
    },
  });

  if (result?.ok) {
    showStatus("Saved successfully! ✓", "success");
    saveBtn.textContent = "Saved ✓";
    setTimeout(() => window.close(), 1500);
  } else {
    showStatus(result?.data?.error || "Failed to save", "error");
    saveBtn.textContent = "Save";
    saveBtn.disabled = false;
  }
}

function showStatus(message, type) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.remove("hidden");
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}
