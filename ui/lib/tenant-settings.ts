export const PROJECT_ID_STORAGE_KEY = "crashlab.projectId";
export const API_KEY_STORAGE_KEY = "crashlab.apiKey";

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

