"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { api, type CreditWalletMetadata, type SubscriptionPlanMetadata, type UserSubscriptionMetadata } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { formatRelativeDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type BillingState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      plans: SubscriptionPlanMetadata[];
      subscription: UserSubscriptionMetadata;
      wallet: CreditWalletMetadata;
    };

export function BillingView() {
  const authSession = useAuthSession();
  const [state, setState] = useState<BillingState>({ status: "loading" });
  const [topupCredits, setTopupCredits] = useState(1000);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManageBilling = authSession?.permissions.can_manage_billing ?? false;

  async function loadBilling() {
    setActionError(null);
    try {
      const [plans, subscription, wallet] = await Promise.all([
        api.listBillingPlans(),
        api.getBillingSubscription(),
        api.getBillingCredits(),
      ]);
      setState({ status: "ready", plans, subscription, wallet });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load billing",
      });
    }
  }

  useEffect(() => {
    void loadBilling();
  }, []);

  const currentPlanId = state.status === "ready" ? state.subscription.plan_id : null;
  const sortedPlans = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }
    return [...state.plans].sort((left, right) => left.monthly_price - right.monthly_price);
  }, [state]);

  async function handleSubscribe(planId: string) {
    setBusyPlanId(planId);
    setActionError(null);
    try {
      const redirect = await api.subscribeToPlan({ plan_id: planId });
      window.location.assign(redirect.url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setBusyPlanId(null);
    }
  }

  async function handleTopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopupBusy(true);
    setActionError(null);
    try {
      const redirect = await api.topupCredits({ credits: topupCredits });
      window.location.assign(redirect.url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to start top-up checkout");
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscription plans, monthly credit grants, top-ups, and queue priority for Sepurux runs.
        </p>
      </div>

      {state.status === "loading" ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-[420px] w-full" />
          </CardContent>
        </Card>
      ) : state.status === "error" ? (
        <Card className="border-rose-500/30">
          <CardContent className="p-5 text-sm text-rose-200">{state.message}</CardContent>
        </Card>
      ) : (
        <>
          {state.wallet.is_low_credit ? (
            <Card className="border-amber-400/30 bg-amber-500/10">
              <CardContent className="p-5 text-sm text-amber-100">
                This workspace is under the low-credit threshold. Campaign runs will stop once the wallet reaches zero.
              </CardContent>
            </Card>
          ) : null}

          {actionError ? (
            <Card className="border-rose-500/30">
              <CardContent className="p-5 text-sm text-rose-200">{actionError}</CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Credits Remaining</CardTitle>
                <CardDescription>Current wallet balance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {state.wallet.balance.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Bucket</CardTitle>
                <CardDescription>Renews with your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {state.wallet.monthly_credits.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top-Up Credits</CardTitle>
                <CardDescription>Non-plan credit add-ons</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {state.wallet.topup_credits.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Queue Priority</CardTitle>
                <CardDescription>Execution order for new runs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold capitalize text-foreground">
                  {state.subscription.queue_priority}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Renews {formatRelativeDate(state.subscription.renewal_date)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>
                {state.subscription.plan_name} · {state.subscription.status}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div>
                <p>
                  Monthly credits:{" "}
                  <span className="font-medium text-foreground">
                    {(state.subscription.monthly_credits ?? 0).toLocaleString()}
                  </span>
                </p>
                <p>
                  Renewal date:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(state.subscription.renewal_date).toLocaleDateString()}
                  </span>
                </p>
                <p>
                  Billing provider:{" "}
                  <span className="font-medium capitalize text-foreground">
                    {state.subscription.billing_provider ?? "manual"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={state.wallet.is_low_credit ? "warning" : "default"}>
                  {state.wallet.queue_priority} queue
                </Badge>
                {canManageBilling && state.subscription.portal_available ? (
                  <Button variant="outline" onClick={() => void handleOpenPortal()} disabled={portalBusy}>
                    {portalBusy ? "Opening..." : "Manage billing"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 lg:grid-cols-2">
              {sortedPlans.map((plan) => {
                const highlights = Array.isArray(plan.features?.highlights)
                  ? (plan.features.highlights as string[])
                  : [];
                const queuePriority =
                  typeof plan.features?.queue_priority === "string"
                    ? (plan.features.queue_priority as string)
                    : "normal";
                const isCurrent = plan.plan_id === currentPlanId;
                const isCheckoutEnabled = plan.checkout_enabled;
                const planActionLabel = isCurrent
                  ? "Current plan"
                  : isCheckoutEnabled
                    ? "Upgrade"
                    : "Contact sales";

                return (
                  <Card key={plan.plan_id} className={isCurrent ? "border-blue-400/40" : undefined}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>
                            ${plan.monthly_price}/month · {plan.monthly_credits.toLocaleString()} credits
                          </CardDescription>
                        </div>
                        {isCurrent ? <Badge>Current</Badge> : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          Queue: <span className="font-medium capitalize text-foreground">{queuePriority}</span>
                        </p>
                        <p>
                          Workspace tier:{" "}
                          <span className="font-medium capitalize text-foreground">
                            {String(plan.features?.workspace_tier ?? "team")}
                          </span>
                        </p>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {highlights.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={isCurrent ? "outline" : "default"}
                        disabled={!canManageBilling || isCurrent || busyPlanId === plan.plan_id || !isCheckoutEnabled}
                        onClick={() => void handleSubscribe(plan.plan_id)}
                      >
                        {busyPlanId === plan.plan_id ? "Redirecting..." : planActionLabel}
                      </Button>
                      {!isCheckoutEnabled && !isCurrent ? (
                        <p className="text-xs text-muted-foreground">
                          This plan is quote-based. Contact the Sepurux team to activate it.
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Up Credits</CardTitle>
                <CardDescription>
                  Add one-off credits without changing the subscription.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canManageBilling ? (
                  <p className="text-sm text-muted-foreground">
                    Billing changes follow the membership bundle. This workspace role can view credits but cannot purchase or upgrade.
                  </p>
                ) : (
                  <form className="space-y-4" onSubmit={handleTopup}>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Credits</span>
                      <input
                        type="number"
                        min={100}
                        step={100}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={topupCredits}
                        onChange={(event) => setTopupCredits(Number(event.target.value))}
                      />
                    </label>
                    <Button className="w-full" type="submit" disabled={topupBusy}>
                      {topupBusy ? "Processing..." : "Purchase Credits"}
                    </Button>
                  </form>
                )}

                <div className="rounded-md border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                  Operation costs:
                  <ul className="mt-2 space-y-1">
                    <li>• Trace replay: 5 credits</li>
                    <li>• Mutation campaign: 20 credits</li>
                    <li>• Large campaign: 50 credits</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
