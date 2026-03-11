import type { AuthSessionMetadata } from "@/lib/api";

const AUTH_SESSION_STORAGE_KEY = "sepurux.authSession";

export function getStoredAuthSession(): AuthSessionMetadata | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSessionMetadata;
  } catch {
    return null;
  }
}

export function setStoredAuthSession(session: AuthSessionMetadata) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore localStorage failures
  }
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}
