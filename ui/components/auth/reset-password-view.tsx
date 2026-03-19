"use client";

import { FormEvent, useMemo, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

import { api } from "@/lib/api";

export function ResetPasswordView() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return token.trim().length > 0 && password.length >= 8 && password === confirmPassword;
  }, [confirmPassword, password, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || busy) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await api.resetPassword({
        token: token.trim(),
        password,
      });
      setSuccessMessage(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border/70 bg-card/80 p-6 shadow-panel">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.14em] text-primary">Account Recovery</p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the token from your email and choose a new password.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Reset token</span>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste reset token"
            className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground outline-none"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">New password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground outline-none"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Confirm new password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat password"
            minLength={8}
            className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground outline-none"
            required
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</> : <><KeyRound className="h-4 w-4" /> Reset password</>}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-5 text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/auth?mode=access&intent=login" className="font-medium text-primary">
          Return to login
        </Link>
      </div>
    </div>
  );
}
