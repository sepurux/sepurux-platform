export const PROJECT_ID_STORAGE_KEY = "sepurux.projectId";
export const API_KEY_STORAGE_KEY = "sepurux.apiKey";
export const API_BASE_URL_STORAGE_KEY = "sepurux.apiBaseUrl";

export function getStoredProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PROJECT_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredProjectId(projectId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECT_ID_STORAGE_KEY, projectId);
  } catch {
    // ignore localStorage failures in private mode / restricted browsers
  }
}

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiKey(apiKey: string) {
  if (typeof window === "undefined") return;
  try {
    const value = apiKey.trim();
    if (value) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch {
    // ignore localStorage failures in private mode / restricted browsers
  }
}

export function getStoredApiBaseUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(API_BASE_URL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiBaseUrl(apiBaseUrl: string) {
  if (typeof window === "undefined") return;
  try {
    const value = apiBaseUrl.trim();
    if (value) {
      window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
    }
  } catch {
    // ignore localStorage failures in private mode / restricted browsers
  }
}
