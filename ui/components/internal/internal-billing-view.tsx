"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  api,
  type InternalBillingAdjustmentResponse,
  type InternalBillingTransactionEntry,
  type InternalBillingWalletEntry,
} from "@/lib/api";

export function InternalBillingView() {
  const [wallets, setWallets] = useState<InternalBillingWalletEntry[]>([]);
  const [transactions, setTransactions] = useState<InternalBillingTransactionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustResult, setAdjustResult] = useState<InternalBillingAdjustmentResponse | null>(null);

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("0");
  const [reason, setReason] = useState("");

  async function loadBilling() {
    try {
      const [walletRecords, transactionRecords] = await Promise.all([
        api.listInternalBillingWallets({ limit: 100 }),
        api.listInternalBillingTransactions({ limit: 100 }),
      ]);
      setWallets(walletRecords);
      setTransactions(transactionRecords);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Failed to load billing control data");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBilling();
  }, []);

  useEffect(() => {
    if (!wallets.length) return;
    if (!userId) {
      setUserId(wallets[0].user_id);
    }
  }, [userId, wallets]);

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      setError("Amount must be a non-zero number");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }

    setAdjusting(true);
    try {
      const response = await api.adjustInternalBillingCredits({
        user_id: userId,
        amount: Math.trunc(parsedAmount),
        reason: reason.trim(),
      });
      setAdjustResult(response);
      setReason("");
      setError(null);
      await loadBilling();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Credit adjustment failed");
      }
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-semibold text-white">Billing Control</h1>
        <p className="mt-1 text-sm text-neutral-400">View all wallets, adjust credits, and inspect transactions.</p>
      </div>

      {loading ? <p className="text-sm text-neutral-400">Loading billing controls...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      <form
        onSubmit={submitAdjustment}
        className="grid gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4 md:grid-cols-4"
      >
        <label className="text-sm text-neutral-300">
          User
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-neutral-700 bg-black px-3 text-sm text-white"
          >
            {wallets.map((wallet) => (
              <option key={wallet.user_id} value={wallet.user_id}>
                {wallet.email ?? wallet.user_id}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-neutral-300">
          Amount
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-neutral-700 bg-black px-3 text-sm text-white"
            placeholder="e.g. 50 or -20"
          />
        </label>

        <label className="text-sm text-neutral-300 md:col-span-2">
          Reason
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-neutral-700 bg-black px-3 text-sm text-white"
            placeholder="Manual correction"
          />
        </label>

        <div className="md:col-span-4">
          <button
            type="submit"
            disabled={adjusting}
            className="rounded border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {adjusting ? "Applying..." : "Apply Adjustment"}
          </button>
        </div>
      </form>

      {adjustResult ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
          Applied adjustment for {adjustResult.wallet.email ?? adjustResult.wallet.user_id}: {" "}
          {adjustResult.transaction.amount > 0 ? "+" : ""}
          {adjustResult.transaction.amount} credits
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
        <p className="border-b border-neutral-800 px-4 py-3 text-xs uppercase tracking-[0.14em] text-neutral-400">
          Wallets
        </p>
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-black/50 text-xs uppercase tracking-[0.14em] text-neutral-500">
            <tr>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Balance</th>
              <th className="px-4 py-2">Monthly</th>
              <th className="px-4 py-2">Top-up</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {wallets.length ? (
              wallets.map((wallet) => (
                <tr key={wallet.wallet_id} className="border-t border-neutral-800 text-neutral-200">
                  <td className="px-4 py-3 text-white">{wallet.email ?? wallet.user_id}</td>
                  <td className="px-4 py-3">{wallet.balance}</td>
                  <td className="px-4 py-3">{wallet.monthly_credits}</td>
                  <td className="px-4 py-3">{wallet.topup_credits}</td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {new Date(wallet.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No wallets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
        <p className="border-b border-neutral-800 px-4 py-3 text-xs uppercase tracking-[0.14em] text-neutral-400">
          Transactions
        </p>
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-black/50 text-xs uppercase tracking-[0.14em] text-neutral-500">
            <tr>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length ? (
              transactions.map((transaction) => (
                <tr key={transaction.credit_transaction_id} className="border-t border-neutral-800 text-neutral-200">
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {new Date(transaction.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-white">{transaction.email ?? transaction.user_id}</td>
                  <td className="px-4 py-3">{transaction.amount}</td>
                  <td className="px-4 py-3">{transaction.type}</td>
                  <td className="px-4 py-3">{transaction.reason}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
