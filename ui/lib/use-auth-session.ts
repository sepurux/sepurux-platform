"use client";

import { useEffect, useState } from "react";

import { api, type AuthSessionMetadata } from "@/lib/api";
import { getStoredAuthSession, setStoredAuthSession } from "@/lib/auth-session";

export function useAuthSession() {
  const [authSession, setAuthSession] = useState<AuthSessionMetadata | null>(() =>
    getStoredAuthSession()
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const session = await api.getAuthSession();
        if (cancelled) {
          return;
        }
        setStoredAuthSession(session);
        setAuthSession(session);
      } catch {
        if (cancelled) {
          return;
        }
        setAuthSession((currentValue) => currentValue);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return authSession;
}
