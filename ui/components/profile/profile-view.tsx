"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Plus, Trash2 } from "lucide-react";

import {
  api,
  type AuthSessionMetadata,
  type CreditTransactionMetadata,
  type CreditWalletMetadata,
  type MemberMetadata,
  type ProjectMetadata,
  type UserSubscriptionMetadata,
} from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GetCreditsModal } from "@/components/billing/get-credits-modal";
import { cn } from "@/lib/utils";
import { dispatchProjectsUpdatedEvent, upsertCachedProject } from "@/lib/project-cache";

type Tab = "settings" | "billing" | "members" | "projects";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      session: AuthSessionMetadata;
      subscription: UserSubscriptionMetadata;
      wallet: CreditWalletMetadata;
      transactions: CreditTransactionMetadata[];
    };

function initialsFor(session: AuthSessionMetadata) {
  const source = session.name || session.email || "U";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

type CreditUsageRow = {
  date: string;
  email: string;
  tool: string;
  cost: number;
  balanceBefore: number;
  balanceAfter: number;
  direction: "Debit" | "Credit";
  source: string;
};

function formatBillingDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatInvoiceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatUsd(amount: number) {
  return `US${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)}`;
}

function creditSourceLabel(transaction: CreditTransactionMetadata) {
  if (transaction.type === "topup_purchase") return "Purchased credits";
  if (transaction.type === "monthly_grant") return "Monthly credits";
  return "Workspace usage";
}

function toolLabel(transaction: CreditTransactionMetadata) {
  const reason = transaction.reason?.trim();
  if (!reason) return "System usage";
  if (reason.startsWith("pack_run:")) {
    return reason.slice("pack_run:".length);
  }
  return reason;
}

function buildCreditUsageRows(
  transactions: CreditTransactionMetadata[],
  currentBalance: number,
  email: string
): CreditUsageRow[] {
  let runningAfter = currentBalance;
  const rows: CreditUsageRow[] = [];

  for (const transaction of transactions) {
    const balanceBefore = runningAfter - transaction.amount;
    rows.push({
      date: transaction.created_at,
      email,
      tool: toolLabel(transaction),
      cost: transaction.amount,
      balanceBefore,
      balanceAfter: runningAfter,
      direction: transaction.amount < 0 ? "Debit" : "Credit",
      source: creditSourceLabel(transaction),
    });
    runningAfter = balanceBefore;
  }
  return rows;
}

export function ProfileView() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [activeTab, setActiveTab] = useState<Tab>("settings");

  const [topupCredits, setTopupCredits] = useState(1000);
  const [topupBusy, setTopupBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [members, setMembers] = useState<MemberMetadata[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"developer" | "viewer">("developer");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [newMemberKey, setNewMemberKey] = useState<{ email: string; key: string } | null>(null);

  // Sync tab from URL hash
  useEffect(() => {
    function syncHash() {
      const hash = window.location.hash.replace("#", "");
      if (hash === "billing") setActiveTab("billing");
      else if (hash === "members") setActiveTab("members");
      else if (hash === "projects") setActiveTab("projects");
      else setActiveTab("settings");
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const load = useCallback(async () => {
    try {
      const [session, subscription, wallet, transactions, projectList, memberList] = await Promise.all([
        api.getAuthSession(),
        api.getBillingSubscription(),
        api.getBillingCredits(),
        api.listCreditTransactions({ limit: 200 }).catch(() => []),
        api.listProjects().catch(() => []),
        api.listMembers().catch(() => []),
      ]);
      setState({ status: "ready", session, subscription, wallet, transactions });
      setProjects(projectList);
      setMembers(memberList);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load profile",
      });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (checkoutStatus !== "success") return;
    const t = setTimeout(() => void load(), 4000);
    return () => clearTimeout(t);
  }, [checkoutStatus, load]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const normalizedPlan = (state.subscription.plan_name ?? state.session.billing_plan_name ?? "")
      .trim()
      .toLowerCase();
    const canInviteFromPlan = new Set(["team", "enterprise"]).has(normalizedPlan);
    const canManageWorkspaceFromPermissions = state.session.permissions.can_manage_workspace;
    if (activeTab === "members" && !(canManageWorkspaceFromPermissions && canInviteFromPlan)) {
      setActiveTab("settings");
      window.history.replaceState(null, "", "/profile");
      return;
    }
    if (activeTab === "projects" && !canManageWorkspaceFromPermissions) {
      setActiveTab("settings");
      window.history.replaceState(null, "", "/profile");
    }
  }, [activeTab, state]);

  async function handleTopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopupBusy(true);
    setActionError(null);
    try {
      const redirect = await api.topupCredits({ credits: topupCredits });
      window.location.assign(redirect.url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to start top-up");
    } finally {
      setTopupBusy(false);
    }
  }

  async function handleOpenPortal() {
    setPortalBusy(true);
    setActionError(null);
    try {
      const redirect = await api.openBillingPortal();
      window.location.assign(redirect.url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to open billing portal");
    } finally {
      setPortalBusy(false);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteEmail.trim() || inviteBusy) return;
    setInviteBusy(true);
    setInviteError(null);
    setNewMemberKey(null);
    try {
      const member = await api.inviteMember({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
      });
      setMembers((prev) => [...prev.filter((m) => m.user_id !== member.user_id), member]);
      if (member.api_key) setNewMemberKey({ email: member.email, key: member.api_key });
      setInviteEmail("");
      setInviteName("");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to invite member");
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      await api.removeMember(userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to remove member");
    }
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name || createBusy) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const created = await api.createProject(name);
      setProjects((prev) => {
        const deduped = prev.filter((project) => project.project_id !== created.project_id);
        return [created, ...deduped];
      });
      upsertCachedProject(created);
      dispatchProjectsUpdatedEvent();
      setNewProjectName("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setCreateBusy(false);
    }
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    window.history.replaceState(null, "", tab === "settings" ? "/profile" : `/profile#${tab}`);
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {state.message}
      </p>
    );
  }

  const { session, subscription, wallet, transactions } = state;
  const initials = initialsFor(session);
  const canManageWorkspace = session.permissions.can_manage_workspace;
  const billingEmail = session.email ?? "workspace@sepurux.local";

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentTransactions = transactions.filter((transaction) => {
    const createdAt = new Date(transaction.created_at).getTime();
    return Number.isFinite(createdAt) && createdAt >= thirtyDaysAgo;
  });
  const usageRows = buildCreditUsageRows(recentTransactions, wallet.balance, billingEmail);
  const invoiceRows = transactions
    .filter((transaction) => transaction.type === "topup_purchase")
    .slice(0, 6)
    .map((transaction) => ({
      date: transaction.created_at,
      status: "Paid",
      amountUsd: transaction.amount * 0.1,
    }));
  const canInviteMembers = new Set(["team", "enterprise"]).has(
    (subscription.plan_name ?? session.billing_plan_name ?? "").trim().toLowerCase()
  );
  const canAccessTeamWorkspaceFeatures = canManageWorkspace && canInviteMembers;

  const tabs: { id: Tab; label: string }[] = [
    { id: "settings", label: "Settings" },
    { id: "billing", label: "Plans & Billing" },
    ...(canAccessTeamWorkspaceFeatures ? [{ id: "members" as Tab, label: "Members" }] : []),
    ...(canManageWorkspace ? [{ id: "projects" as Tab, label: "Projects" }] : []),
  ];

  return (
    <div>
      {/* workspace header */}
      <div className="border-b border-border/60 pb-0">
        <div className="flex items-center gap-4 pb-5">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold"
            style={{ background: "rgba(0,229,204,0.15)", color: "var(--accent-teal)" }}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {session.name ?? session.email ?? "Workspace"}
            </h1>
            {session.email && session.name ? (
              <p className="text-sm text-muted-foreground">{session.email}</p>
            ) : null}
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={cn(
                "border-b-2 px-4 pb-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* alerts */}
      <div className="mt-6 space-y-3">
        {checkoutStatus === "success" ? (
          <p className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Payment successful — your balance will update in a moment.
          </p>
        ) : checkoutStatus === "cancelled" ? (
          <p className="rounded-md border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
            Checkout was cancelled. No charge was made.
          </p>
        ) : null}
        {actionError ? (
          <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {actionError}
          </p>
        ) : null}
      </div>

      {/* ── Settings tab ── */}
      {activeTab === "settings" ? (
        <div className="mt-6 space-y-0 divide-y divide-border/50 rounded-lg border border-border/50">
          <Row label="Name">
            <span className="text-sm text-foreground">{session.name ?? "—"}</span>
          </Row>
          <Row label="Email">
            <span className="text-sm text-foreground">{session.email ?? "—"}</span>
          </Row>
          <Row label="Role">
            <span className="capitalize text-sm text-foreground">{session.role_name}</span>
          </Row>
          <Row label="Workspace">
            <span className="text-sm text-foreground">{session.project_name}</span>
          </Row>
          <Row label="Plan">
            <span className="text-sm text-foreground">{session.billing_plan_name ?? "Free"}</span>
          </Row>
          <Row label="Queue priority">
            <span className="capitalize text-sm text-foreground">{session.queue_priority ?? "normal"}</span>
          </Row>
        </div>
      ) : null}

      {/* ── Billing tab ── */}
      {activeTab === "billing" ? (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="mb-4 text-base font-semibold text-foreground">Workspace plan details</h2>

            <div className="divide-y divide-border/50 rounded-lg border border-border/50">
              <BillingRow
                label="Subscription"
                content={
                  <div>
                    <p className="font-medium text-foreground">{subscription.plan_name ?? "Free"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Renews {formatRelativeDate(subscription.renewal_date)}
                      {subscription.monthly_price != null ? ` · $${subscription.monthly_price}/mo` : ""}
                    </p>
                  </div>
                }
                actions={
                  <>
                    {subscription.portal_available ? (
                      <Button variant="outline" size="sm" onClick={() => void handleOpenPortal()} disabled={portalBusy}>
                        {portalBusy ? "Opening..." : "Manage billing"}
                        {!portalBusy && <ArrowUpRight className="ml-1 h-3.5 w-3.5" />}
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={() => setCreditsModalOpen(true)}>
                      Update plan
                    </Button>
                  </>
                }
              />

              <BillingRow
                label="Credits"
                content={
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {wallet.balance.toLocaleString()} workspace credits
                      </p>
                      <p className="text-sm text-muted-foreground">Credits are consumed per campaign run.</p>
                    </div>
                    {wallet.is_low_credit ? (
                      <p className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
                        Low balance — runs will stop when credits reach zero.
                      </p>
                    ) : null}
                    <div className="pt-1 space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-semibold text-foreground">{wallet.monthly_credits.toLocaleString()}</span>{" "}
                        monthly plan credits
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">{wallet.topup_credits.toLocaleString()}</span>{" "}
                        purchased credits · do not expire
                      </p>
                    </div>
                  </div>
                }
                actions={
                  <>
                    <Button variant="outline" size="sm" onClick={() => setCreditsModalOpen(true)}>
                      Get credits
                    </Button>
                  </>
                }
              />

              <BillingRow
                label="Buy credits"
                content={
                  <form className="flex items-center gap-2" onSubmit={handleTopup}>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      className="w-28 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                      value={topupCredits}
                      onChange={(e) => setTopupCredits(Number(e.target.value))}
                    />
                    <Button type="submit" size="sm" disabled={topupBusy}>
                      {topupBusy ? "Processing..." : "Purchase"}
                    </Button>
                  </form>
                }
                actions={null}
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-border/50 pt-6">
            <h2 className="text-2xl font-semibold text-foreground">Invoices</h2>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/25 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.length ? (
                    invoiceRows.map((invoice, index) => (
                      <tr
                        key={`${invoice.date}-${index}`}
                        className={cn(
                          "border-t border-border/40",
                          index % 2 === 0 ? "bg-card/60" : "bg-background"
                        )}
                      >
                        <td className="px-5 py-4 text-foreground">{formatInvoiceDate(invoice.date)}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium uppercase text-muted-foreground">
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-foreground">{formatUsd(invoice.amountUsd)}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                            onClick={() => void handleOpenPortal()}
                            disabled={!subscription.portal_available || portalBusy}
                          >
                            {portalBusy ? "Opening..." : "View | Download"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-border/40 bg-card/60">
                      <td className="px-5 py-4 text-foreground">{formatInvoiceDate(subscription.renewal_date)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium uppercase text-muted-foreground">
                          Paid
                        </span>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {formatUsd(subscription.monthly_price ?? 0)}
                      </td>
                      <td className="px-5 py-4 text-right text-muted-foreground">
                        {subscription.portal_available ? "View | Download" : "Upgrade required"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-foreground">
                Credit usage table <span className="text-muted-foreground">(last 30 days)</span>
              </h3>
              <Button type="button" onClick={() => setCreditsModalOpen(true)}>
                Upgrade to download
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="min-w-[1120px] text-left text-sm">
                <thead className="bg-muted/25 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Tool</th>
                    <th className="px-4 py-3 font-medium">Cost</th>
                    <th className="px-4 py-3 font-medium">Balance Before</th>
                    <th className="px-4 py-3 font-medium">Balance After</th>
                    <th className="px-4 py-3 font-medium">Credit/Debit</th>
                    <th className="px-4 py-3 font-medium">Credit Source</th>
                  </tr>
                </thead>
                <tbody>
                  {usageRows.length ? (
                    usageRows.map((row, index) => (
                      <tr
                        key={`${row.date}-${row.cost}-${index}`}
                        className={cn(
                          "border-t border-border/40",
                          index % 2 === 0 ? "bg-card/60" : "bg-background"
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-foreground">{formatBillingDate(row.date)}</td>
                        <td className="px-4 py-3 text-foreground">{row.email}</td>
                        <td className="px-4 py-3 text-foreground">{row.tool}</td>
                        <td
                          className={cn(
                            "px-4 py-3 font-medium",
                            row.cost < 0
                              ? "text-rose-700 dark:text-rose-300"
                              : "text-emerald-700 dark:text-emerald-300"
                          )}
                        >
                          {row.cost}
                        </td>
                        <td className="px-4 py-3 text-foreground">{row.balanceBefore}</td>
                        <td className="px-4 py-3 text-foreground">{row.balanceAfter}</td>
                        <td className="px-4 py-3 text-foreground">{row.direction}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.source}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-border/40 bg-card/60">
                      <td className="px-4 py-4 text-muted-foreground" colSpan={8}>
                        No credit activity in the last 30 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {/* ── Members tab ── */}
      {activeTab === "members" && canAccessTeamWorkspaceFeatures ? (
        <div className="mt-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Workspace Members</h2>

          <div className="space-y-4">
              {/* New API key reveal */}
              {newMemberKey ? (
                <div className="rounded-lg border border-emerald-300 bg-emerald-100 px-5 py-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    Invite sent for <span className="font-semibold">{newMemberKey.email}</span> — share this API key with them (shown once):
                  </p>
                  <code className="mt-2 block break-all rounded bg-emerald-900/10 px-3 py-2 text-xs text-emerald-800 dark:bg-black/30 dark:text-emerald-300">
                    {newMemberKey.key}
                  </code>
                  <button className="mt-2 text-xs text-emerald-700 underline dark:text-emerald-400" onClick={() => setNewMemberKey(null)}>
                    Dismiss
                  </button>
                </div>
              ) : null}

              {/* Member list */}
              <div className="divide-y divide-border/50 rounded-lg border border-border/50">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.name ?? member.email}</p>
                      {member.name ? <p className="text-xs text-muted-foreground">{member.email}</p> : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        member.role === "admin"
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
                          : member.role === "developer"
                          ? "bg-teal-500/15 text-teal-300"
                          : "bg-muted/50 text-muted-foreground"
                      )}>
                        {member.role}
                      </span>
                      {member.role !== "admin" ? (
                        <button
                          onClick={() => void handleRemoveMember(member.user_id)}
                          className="text-muted-foreground transition-colors hover:text-rose-400"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}

                {/* Invite form */}
                <div className="px-5 py-4">
                  <p className="mb-3 text-sm font-medium text-foreground">Invite a member</p>
                  <form className="space-y-3" onSubmit={handleInvite}>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="Email address"
                        className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Name (optional)"
                        className="w-36 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                      <select
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "developer" | "viewer")}
                      >
                        <option value="developer">Developer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <Button type="submit" size="sm" disabled={inviteBusy || !inviteEmail.trim()}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {inviteBusy ? "Inviting..." : "Invite member"}
                    </Button>
                  </form>
                  {inviteError ? <p className="mt-2 text-sm text-rose-300">{inviteError}</p> : null}
                </div>
              </div>
          </div>
        </div>
      ) : null}

      {/* ── Projects tab ── */}
      {activeTab === "projects" && canManageWorkspace ? (
        <div className="mt-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Projects</h2>

          <div className="divide-y divide-border/50 rounded-lg border border-border/50">
            {projects.map((project) => (
              <div key={project.project_id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-foreground">{project.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{project.project_id}</p>
                </div>
              </div>
            ))}

            {/* create new */}
            <div className="px-6 py-4">
              <form className="flex items-center gap-3" onSubmit={handleCreateProject}>
                <input
                  type="text"
                  placeholder="New project name"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
                <Button type="submit" size="sm" disabled={createBusy || !newProjectName.trim()}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {createBusy ? "Creating..." : "Create"}
                </Button>
              </form>
              {createError ? (
                <p className="mt-2 text-sm text-rose-300">{createError}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {creditsModalOpen ? (
        <GetCreditsModal
          currentPlanName={session.billing_plan_name ?? null}
          onClose={() => setCreditsModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function BillingRow({
  label,
  content,
  actions,
}: {
  label: string;
  content: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="w-32 shrink-0 pt-0.5 text-sm text-muted-foreground">{label}</div>
      <div className="flex-1">{content}</div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
