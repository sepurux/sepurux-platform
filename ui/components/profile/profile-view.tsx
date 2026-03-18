"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Coins, CreditCard, FolderKanban, Plus, User } from "lucide-react";

import {
  api,
  type AuthSessionMetadata,
  type CreditWalletMetadata,
  type ProjectMetadata,
  type UserSubscriptionMetadata,
} from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GetCreditsModal } from "@/components/billing/get-credits-modal";

type BillingState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      session: AuthSessionMetadata;
      subscription: UserSubscriptionMetadata;
      wallet: CreditWalletMetadata;
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

export function ProfileView() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const [state, setState] = useState<BillingState>({ status: "loading" });
  const [topupCredits, setTopupCredits] = useState(1000);
  const [topupBusy, setTopupBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [session, subscription, wallet, projectList] = await Promise.all([
        api.getAuthSession(),
        api.getBillingSubscription(),
        api.getBillingCredits(),
        api.listProjects().catch(() => []),
      ]);
      setState({ status: "ready", session, subscription, wallet });
      setProjects(projectList);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load profile",
      });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // After a successful checkout, Stripe fires the webhook async.
  // Poll once after 4s to pick up the updated balance.
  useEffect(() => {
    if (checkoutStatus !== "success") return;
    const t = setTimeout(() => void load(), 4000);
    return () => clearTimeout(t);
  }, [checkoutStatus, load]);

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

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name || createBusy) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const created = await api.createProject(name);
      setProjects((prev) => [...prev, created]);
      setNewProjectName("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setCreateBusy(false);
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

  if (state.status === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
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

  const { session, subscription, wallet } = state;
  const initials = initialsFor(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account details and billing for your workspace.
        </p>
      </div>

      {checkoutStatus === "success" ? (
        <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Payment successful — your balance will update in a moment.
        </p>
      ) : checkoutStatus === "cancelled" ? (
        <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Checkout was cancelled. No charge was made.
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {actionError}
        </p>
      ) : null}

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold"
              style={{ background: "rgba(0,229,204,0.15)", color: "var(--accent-teal)" }}
            >
              {initials}
            </div>
            <div>
              <CardTitle className="text-lg">
                {session.name ?? session.email ?? "Workspace User"}
              </CardTitle>
              {session.email ? (
                <CardDescription className="mt-0.5">{session.email}</CardDescription>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              <User className="mr-1.5 h-3 w-3" />
              {session.role_name}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {session.project_name}
            </Badge>
            {session.billing_plan_name ? (
              <Badge variant="outline">{session.billing_plan_name}</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription
              </CardTitle>
              <CardDescription className="mt-1">
                {subscription.plan_name ?? "Free"} · renews {formatRelativeDate(subscription.renewal_date)}
              </CardDescription>
            </div>
            <Badge variant={subscription.status === "active" ? "default" : "warning"}>
              {subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Monthly price</p>
              <p className="mt-0.5 font-medium text-foreground">
                {subscription.monthly_price != null
                  ? `$${subscription.monthly_price}/mo`
                  : "Custom"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Monthly credits</p>
              <p className="mt-0.5 font-medium text-foreground">
                {(subscription.monthly_credits ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Queue priority</p>
              <p className="mt-0.5 font-medium capitalize text-foreground">
                {subscription.queue_priority}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setCreditsModalOpen(true)}
            >
              Update plan
            </Button>
            {subscription.portal_available ? (
              <Button
                variant="outline"
                onClick={() => void handleOpenPortal()}
                disabled={portalBusy}
              >
                {portalBusy ? "Opening..." : "Manage billing"}
                {!portalBusy && <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
            Credits
          </CardTitle>
          <CardDescription>
            {wallet.balance.toLocaleString()} credits remaining · credits are consumed per run
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {wallet.is_low_credit ? (
            <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Low credit balance — campaign runs will stop when the wallet reaches zero.
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total balance</p>
              <p className="mt-0.5 text-2xl font-semibold text-foreground">
                {wallet.balance.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Monthly plan</p>
              <p className="mt-0.5 text-2xl font-semibold text-foreground">
                {wallet.monthly_credits.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Purchased</p>
              <p className="mt-0.5 text-2xl font-semibold text-foreground">
                {wallet.topup_credits.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4">
            <p className="mb-3 text-sm font-medium text-foreground">Purchase credits</p>
            <form className="flex items-end gap-3" onSubmit={handleTopup}>
              <label className="flex-1 space-y-1 text-sm">
                <span className="text-muted-foreground">Amount</span>
                <input
                  type="number"
                  min={100}
                  step={100}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={topupCredits}
                  onChange={(e) => setTopupCredits(Number(e.target.value))}
                />
              </label>
              <Button type="submit" disabled={topupBusy}>
                {topupBusy ? "Processing..." : "Buy credits"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreditsModalOpen(true)}>
                Get credits
              </Button>
            </form>
          </div>

          <div className="rounded-md border border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium uppercase tracking-wider">Credit costs per operation</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              <span><span className="font-medium text-foreground">5</span> · Trace replay</span>
              <span><span className="font-medium text-foreground">20</span> · Mutation campaign</span>
              <span><span className="font-medium text-foreground">50</span> · Large campaign (50+ attempts)</span>
              <span><span className="font-medium text-foreground">pack cost</span> · Scheduled pack run</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects — only shown for non-project-scoped users */}
      {!session.project_scoped ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
              Projects
            </CardTitle>
            <CardDescription>
              Manage projects in your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length > 0 ? (
              <ul className="divide-y divide-border/50 rounded-md border border-border/50">
                {projects.map((project) => (
                  <li key={project.project_id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="font-medium text-foreground">{project.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{project.project_id.slice(0, 8)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <form className="flex items-end gap-3" onSubmit={handleCreateProject}>
              <label className="flex-1 space-y-1 text-sm">
                <span className="text-muted-foreground">New project name</span>
                <input
                  type="text"
                  placeholder="e.g. production"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/50"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={createBusy || !newProjectName.trim()}>
                <Plus className="mr-1.5 h-4 w-4" />
                {createBusy ? "Creating..." : "Create"}
              </Button>
            </form>

            {createError ? (
              <p className="text-sm text-rose-300">{createError}</p>
            ) : null}
          </CardContent>
        </Card>
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
