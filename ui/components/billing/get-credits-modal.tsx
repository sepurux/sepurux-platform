"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

import { api, type SubscriptionPlanMetadata } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Props = {
  currentPlanName: string | null;
  onClose: () => void;
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; plans: SubscriptionPlanMetadata[] };

const PLAN_ORDER = ["Free", "Pro", "Team", "Enterprise"];
const TRACE_REPLAY_COST = 5;
const MUTATION_CAMPAIGN_COST = 20;
const LARGE_CAMPAIGN_COST = 50;

function sortPlans(plans: SubscriptionPlanMetadata[]) {
  return [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.findIndex((n) => a.name.toLowerCase().includes(n.toLowerCase()));
    const bi = PLAN_ORDER.findIndex((n) => b.name.toLowerCase().includes(n.toLowerCase()));
    if (ai === -1 && bi === -1) return a.monthly_price - b.monthly_price;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function estimateMonthlyCapacity(monthlyCredits: number) {
  return {
    traceReplays: Math.floor(monthlyCredits / TRACE_REPLAY_COST),
    mutationCampaigns: Math.floor(monthlyCredits / MUTATION_CAMPAIGN_COST),
    largeCampaigns: Math.floor(monthlyCredits / LARGE_CAMPAIGN_COST),
  };
}

function actionLabelForPlan(plan: SubscriptionPlanMetadata, currentPlan: SubscriptionPlanMetadata | null) {
  if (!currentPlan) {
    return "Choose plan";
  }
  if (plan.monthly_price > currentPlan.monthly_price) {
    return "Upgrade";
  }
  if (plan.monthly_price < currentPlan.monthly_price) {
    return "Downgrade";
  }
  return "Switch plan";
}

export function GetCreditsModal({ currentPlanName, onClose }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listBillingPlans()
      .then((plans) => setState({ status: "ready", plans }))
      .catch((err) => setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load plans" }));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSelect(planId: string, checkoutEnabled: boolean) {
    if (!checkoutEnabled) return;
    setBusyPlanId(planId);
    setActionError(null);
    try {
      const redirect = await api.subscribeToPlan({ plan_id: planId });
      window.location.assign(redirect.url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start checkout");
      setBusyPlanId(null);
    }
  }

  const plans = state.status === "ready" ? sortPlans(state.plans) : [];
  const currentPlan =
    currentPlanName == null
      ? null
      : plans.find((plan) => plan.name.toLowerCase() === currentPlanName.toLowerCase()) ?? null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-border/70 bg-card shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Choose a plan</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Compare monthly analysis volume, run capacity, and queue priority before checkout.
            </p>
            {currentPlan ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Current plan: <span className="font-medium text-foreground">{currentPlan.name}</span> (
                {currentPlan.monthly_credits.toLocaleString()} analyses / month)
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* body */}
        <div className="p-6">
          {actionError ? (
            <p className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {actionError}
            </p>
          ) : null}

          {state.status === "loading" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl border border-border/50 bg-muted/30" />
              ))}
            </div>
          ) : state.status === "error" ? (
            <p className="text-sm text-rose-300">{state.message}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isCurrent = currentPlanName !== null &&
                  plan.name.toLowerCase() === currentPlanName.toLowerCase();
                const highlights = Array.isArray(plan.features?.highlights)
                  ? (plan.features.highlights as string[])
                  : [];
                const queuePriority =
                  typeof plan.features?.queue_priority === "string"
                    ? plan.features.queue_priority
                    : "normal";
                const isEnterprise = !plan.checkout_enabled && !isCurrent;
                const capacity = estimateMonthlyCapacity(plan.monthly_credits);

                return (
                  <div
                    key={plan.plan_id}
                    className={`relative flex flex-col rounded-xl border p-5 transition ${
                      isCurrent
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 bg-background/60 hover:border-border"
                    }`}
                  >
                    {isCurrent ? (
                      <span className="absolute right-3 top-3 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Current
                      </span>
                    ) : null}

                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {plan.name}
                    </p>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        {plan.monthly_price === 0 ? "$0" : `$${plan.monthly_price}`}
                      </span>
                      {plan.monthly_price > 0 ? (
                        <span className="mb-1 text-xs text-muted-foreground">/mo</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.monthly_credits.toLocaleString()} analyses · {queuePriority} queue
                    </p>
                    <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                      <p className="font-medium uppercase tracking-wide text-foreground">Approx monthly capacity</p>
                      <p className="mt-1">
                        Up to {capacity.traceReplays.toLocaleString()} trace replays,{" "}
                        {capacity.mutationCampaigns.toLocaleString()} campaigns, or{" "}
                        {capacity.largeCampaigns.toLocaleString()} large campaigns.
                      </p>
                    </div>

                    <ul className="mt-4 flex-1 space-y-2">
                      {highlights.slice(0, 5).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current plan
                        </Button>
                      ) : isEnterprise ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open("/book-demo", "_blank")}
                        >
                          Contact sales
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          disabled={busyPlanId === plan.plan_id}
                          onClick={() => void handleSelect(plan.plan_id, plan.checkout_enabled)}
                        >
                          {busyPlanId === plan.plan_id
                            ? "Redirecting..."
                            : actionLabelForPlan(plan, currentPlan)}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* operation costs */}
          <div className="mt-6 rounded-xl border border-border/50 bg-muted/20 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Run budget per operation
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{TRACE_REPLAY_COST}</span> · Trace replay
              </span>
              <span>
                <span className="font-medium text-foreground">{MUTATION_CAMPAIGN_COST}</span> · Mutation campaign
              </span>
              <span>
                <span className="font-medium text-foreground">{LARGE_CAMPAIGN_COST}</span> · Large campaign (50+
                attempts)
              </span>
              <span><span className="font-medium text-foreground">pack cost</span> · Scheduled pack run</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
