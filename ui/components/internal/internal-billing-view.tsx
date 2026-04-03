"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  api,
  type InternalBillingAdjustmentResponse,
  type InternalBillingTransactionEntry,
  type InternalBillingWalletEntry,
  type SubscriptionPlanMetadata,
} from "@/lib/api";

export function InternalBillingView() {
  const [wallets, setWallets] = useState<InternalBillingWalletEntry[]>([]);
  const [transactions, setTransactions] = useState<InternalBillingTransactionEntry[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [adjustResult, setAdjustResult] = useState<InternalBillingAdjustmentResponse | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("0");
  const [creditReason, setCreditReason] = useState("");
  const [planId, setPlanId] = useState("");
  const [planReason, setPlanReason] = useState("");

  async function loadBilling() {
    try {
      const [walletRecords, transactionRecords, planRecords] = await Promise.all([
        api.listInternalBillingWallets({ limit: 100 }),
        api.listInternalBillingTransactions({ limit: 100 }),
        api.listInternalBillingPlans(),
      ]);
      setWallets(walletRecords);
      setTransactions(transactionRecords);
      setPlans(planRecords);
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

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.user_id === userId) ?? null,
    [userId, wallets]
  );

  useEffect(() => {
    if (!plans.length) return;

    if (selectedWallet?.plan_id) {
      setPlanId(selectedWallet.plan_id);
      return;
    }

    setPlanId((current) => current || plans[0].plan_id);
  }, [plans, selectedWallet?.plan_id, selectedWallet?.user_id]);

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      setError("Amount must be a non-zero number");
      return;
    }
    if (!creditReason.trim()) {
      setError("Reason is required");
      return;
    }

    setAdjusting(true);
    setPlanStatus(null);
    try {
      const response = await api.adjustInternalBillingCredits({
        user_id: userId,
        amount: Math.trunc(parsedAmount),
        reason: creditReason.trim(),
      });
      setAdjustResult(response);
      setCreditReason("");
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

  async function submitPlanChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !planId) {
      setError("User and plan are required");
      return;
    }
    if (!planReason.trim()) {
      setError("Reason is required");
      return;
    }

    setChangingPlan(true);
    setAdjustResult(null);
    try {
      const response = await api.updateInternalBillingSubscription({
        user_id: userId,
        plan_id: planId,
        reason: planReason.trim(),
      });
      setPlanStatus(
        `Updated ${response.wallet.email ?? response.wallet.user_id} to ${response.subscription.plan_name ?? "selected"} plan.`
      );
      setPlanReason("");
      setError(null);
      await loadBilling();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Plan update failed");
      }
    } finally {
      setChangingPlan(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">Billing Control</h1>
        <p className="mt-1 text-sm text-muted-foreground">View all wallets, adjust credits, and inspect transactions.</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading billing controls...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      <form
        onSubmit={submitPlanChange}
        className="grid gap-3 rounded-lg border border-border/70 bg-card/70 p-4 md:grid-cols-4"
      >
        <div className="md:col-span-4">
          <p className="text-sm font-semibold text-foreground">Subscription override</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Change the user&apos;s active plan immediately without adding or removing credits. Use credit adjustments separately when you need to top up or correct wallet balances.
          </p>
        </div>

        <label className="text-sm text-muted-foreground">
          User
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-border/70 bg-background px-3 text-sm text-foreground"
          >
            {wallets.map((wallet) => (
              <option key={wallet.user_id} value={wallet.user_id}>
                {wallet.email ?? wallet.user_id}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-muted-foreground">
          Current plan
          <div className="mt-1 flex h-10 items-center rounded border border-border/70 bg-background px-3 text-sm text-foreground">
            {selectedWallet?.plan_name ?? "Unassigned"}
          </div>
        </label>

        <label className="text-sm text-muted-foreground">
          New plan
          <select
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-border/70 bg-background px-3 text-sm text-foreground"
          >
            {plans.map((plan) => (
              <option key={plan.plan_id} value={plan.plan_id}>
                {plan.name} · {plan.monthly_credits.toLocaleString()} credits
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-muted-foreground">
          Reason
          <input
            value={planReason}
            onChange={(event) => setPlanReason(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-border/70 bg-background px-3 text-sm text-foreground"
            placeholder="Early access override"
          />
        </label>

        <div className="md:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={changingPlan}
            className="rounded border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
          >
            {changingPlan ? "Updating..." : "Apply Plan"}
          </button>
          {planStatus ? <p className="text-sm text-primary">{planStatus}</p> : null}
        </div>
      </form>

      <form
        onSubmit={submitAdjustment}
        className="grid gap-3 rounded-lg border border-border/70 bg-card/70 p-4 md:grid-cols-4"
      >
        <div className="md:col-span-4">
          <p className="text-sm font-semibold text-foreground">Credit adjustment</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use this for one-off manual top-ups or corrections without changing the user&apos;s plan.
          </p>
        </div>
        <label className="text-sm text-muted-foreground">
          User
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-border/70 bg-background px-3 text-sm text-foreground"
          >
            {wallets.map((wallet) => (
              <option key={wallet.user_id} value={wallet.user_id}>
                {wallet.email ?? wallet.user_id}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-muted-foreground">
          Amount
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-border/70 bg-background px-3 text-sm text-foreground"
            placeholder="e.g. 50 or -20"
          />
        </label>

        <label className="text-sm text-muted-foreground md:col-span-2">
          Reason
          <input
            value={creditReason}
            onChange={(event) => setCreditReason(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-border/70 bg-background px-3 text-sm text-foreground"
            placeholder="Manual correction"
          />
        </label>

        <div className="md:col-span-4">
          <button
            type="submit"
            disabled={adjusting}
            className="rounded border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
          >
            {adjusting ? "Applying..." : "Apply Adjustment"}
          </button>
        </div>
      </form>

      {adjustResult ? (
        <div className="rounded-lg border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
          Applied adjustment for {adjustResult.wallet.email ?? adjustResult.wallet.user_id}: {" "}
          {adjustResult.transaction.amount > 0 ? "+" : ""}
          {adjustResult.transaction.amount} credits
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
        <p className="border-b border-border/70 px-4 py-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Wallets
        </p>
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-background/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">Balance</th>
              <th className="px-4 py-2">Monthly</th>
              <th className="px-4 py-2">Top-up</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {wallets.length ? (
              wallets.map((wallet) => (
                <tr key={wallet.wallet_id} className={`border-t border-border/70 text-muted-foreground ${wallet.balance <= 0 ? "bg-red-950/20" : ""}`}>
                  <td className="px-4 py-3 text-foreground">{wallet.email ?? wallet.user_id}</td>
                  <td className="px-4 py-3">{wallet.plan_name ?? "-"}</td>
                  <td className="px-4 py-3">{wallet.pricing_tier ?? "-"}</td>
                  <td className={`px-4 py-3 font-medium ${wallet.balance <= 0 ? "text-red-400" : wallet.balance < 20 ? "text-amber-400" : "text-emerald-400"}`}>
                    {wallet.balance}
                  </td>
                  <td className="px-4 py-3">{wallet.monthly_credits}</td>
                  <td className="px-4 py-3">{wallet.topup_credits}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(wallet.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No wallets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
        <p className="border-b border-border/70 px-4 py-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Transactions
        </p>
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-background/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
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
                <tr key={transaction.credit_transaction_id} className="border-t border-border/70 text-muted-foreground">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-foreground">{transaction.email ?? transaction.user_id}</td>
                  <td className={`px-4 py-3 font-medium tabular-nums ${transaction.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                  </td>
                  <td className="px-4 py-3">{transaction.type}</td>
                  <td className="px-4 py-3">{transaction.reason}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
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
