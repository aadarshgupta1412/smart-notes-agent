const API_BASE = "http://localhost:3000/api";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_AUTH") {
    getStoredAuth().then(sendResponse);
    return true;
  }

  if (message.type === "LOGIN") {
    handleLogin().then(sendResponse);
    return true;
  }

  if (message.type === "LOGOUT") {
    chrome.storage.local.remove(["auth_token", "user_info"], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "API_REQUEST") {
    handleApiRequest(message.endpoint, message.options).then(sendResponse);
    return true;
  }
});

async function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["auth_token", "user_info"], (result) => {
      resolve({
        token: result.auth_token || null,
        user: result.user_info || null,
      });
    });
  });
}

async function handleLogin() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });

    const response = await fetch(`${API_BASE}/auth/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token }),
    });

    if (!response.ok) {
      throw new Error("Auth failed");
    }

    const data = await response.json();

    await new Promise((resolve) => {
      chrome.storage.local.set(
        {
          auth_token: data.session.access_token,
          user_info: data.user,
        },
        resolve
      );
    });

    return { success: true, user: data.user };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, error: error.message };
  }
}

async function handleApiRequest(endpoint, options = {}) {
  try {
    const { auth_token } = await new Promise((resolve) => {
      chrome.storage.local.get(["auth_token"], resolve);
    });

    if (!auth_token) {
      return { error: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth_token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { error: error.message };
  }
}
