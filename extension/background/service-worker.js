import { CONFIG } from "../config.js";

const API_BASE = CONFIG.API_BASE;
const GOOGLE_CLIENT_ID = CONFIG.GOOGLE_CLIENT_ID;

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
    // Use launchWebAuthFlow to get an id_token (required by Supabase)
    const redirectUri = chrome.identity.getRedirectURL();
    console.log("Redirect URI:", redirectUri);
    
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("scope", "openid email profile");

    console.log("Auth URL:", authUrl.toString());

    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: true },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Auth flow error:", chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            reject(new Error("No response from auth flow"));
          } else {
            console.log("Auth response URL:", response);
            resolve(response);
          }
        }
      );
    });

    // Parse the response URL to extract the id_token
    const hashParams = new URLSearchParams(responseUrl.split("#")[1]);
    const idToken = hashParams.get("id_token");
    console.log("Got id_token:", idToken ? "yes" : "no");

    if (!idToken) {
      throw new Error("No id_token in response");
    }

    // Send id_token to our API to exchange for Supabase session
    const response = await fetch(`${API_BASE}/auth/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Auth failed");
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
