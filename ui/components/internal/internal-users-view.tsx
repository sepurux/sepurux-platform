"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiError, api, type InternalBillingWalletEntry } from "@/lib/api";

const cardBase = "rounded-lg border border-border/70 bg-card/70 p-4";

export function InternalUsersView() {
  const [wallets, setWallets] = useState<InternalBillingWalletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await api.listInternalBillingWallets({ limit: 200 });
        if (cancelled) return;
        setWallets(payload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to load internal users");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredWallets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return wallets;

    return wallets.filter((wallet) => {
      const email = (wallet.email ?? "").toLowerCase();
      const name = (wallet.name ?? "").toLowerCase();
      const userId = wallet.user_id.toLowerCase();
      return email.includes(needle) || name.includes(needle) || userId.includes(needle);
    });
  }, [query, wallets]);

  const totalBalance = useMemo(
    () => wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
    [wallets]
  );

  const usersWithoutCredits = useMemo(
    () => wallets.filter((wallet) => wallet.balance <= 0).length,
    [wallets]
  );

  const topWallet = useMemo(() => {
    if (!wallets.length) return null;
    return wallets.reduce((best, current) => (current.balance > best.balance ? current : best));
  }, [wallets]);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal view of user wallets, balances, and credit posture.
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by email, name, or user id"
          className="h-10 w-full rounded-md border border-border/70 bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground sm:w-72"
        />
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading users...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Users (wallets)</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{wallets.length.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total Credits Balance</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{totalBalance.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Users At / Below 0</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{usersWithoutCredits.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Highest Balance</p>
              <p className="mt-2 text-lg font-semibold text-primary">
                {topWallet ? `${topWallet.email ?? topWallet.user_id} (${topWallet.balance})` : "n/a"}
              </p>
            </article>
          </div>

          <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-background/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Monthly Credits</th>
                  <th className="px-4 py-3">Top-up Credits</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredWallets.length ? (
                  filteredWallets.map((wallet) => (
                    <tr key={wallet.wallet_id} className="border-t border-border/70 text-muted-foreground">
                      <td className="px-4 py-3 text-foreground">{wallet.email ?? wallet.user_id}</td>
                      <td className="px-4 py-3">{wallet.name ?? "-"}</td>
                      <td className="px-4 py-3">{wallet.balance}</td>
                      <td className="px-4 py-3">{wallet.monthly_credits}</td>
                      <td className="px-4 py-3">{wallet.topup_credits}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(wallet.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No users matched the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
