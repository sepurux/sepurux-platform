"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AuthSessionMetadata } from "@/lib/api";
import {
  NEW_USER_TOUR_OPEN_EVENT,
  NEW_USER_TOUR_VERSION,
} from "@/lib/onboarding-tour";

type TourStep = {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  optional?: boolean;
};

const ESTIMATED_CARD_HEIGHT = 254;
const VIEWPORT_MARGIN = 16;

function tourIdentityForSession(session: AuthSessionMetadata): string {
  const userIdentifier = session.user_id ?? session.email ?? "anonymous";
  return `${userIdentifier}:${session.tenant_id}:${session.project_id}`;
}

function storageKeyForSession(session: AuthSessionMetadata): string {
  return `sepurux.ui.tour.${NEW_USER_TOUR_VERSION}:${tourIdentityForSession(session)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function NewUserTour({ authSession }: { authSession: AuthSessionMetadata | null }) {
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = useMemo<TourStep[]>(() => {
    const canManageWorkspace = authSession?.permissions.can_manage_workspace ?? false;
    return [
      {
        id: "welcome",
        title: "Welcome to Sepurux",
        description:
          "This quick tour shows where to run experiments, inspect failures, and manage credits. It takes under one minute.",
      },
      {
        id: "sidebar-navigation",
        title: "Navigate your workflow",
        description:
          "Use the sidebar to jump between traces, runs, campaigns, mutations, policies, and settings.",
        targetSelector: '[data-tour=\"sidebar-nav\"]',
      },
      {
        id: "top-tabs",
        title: "Stay in context",
        description:
          "Top tabs are your fast lane for daily workflows. They keep high-frequency views one click away.",
        targetSelector: '[data-tour=\"top-tabs\"]',
      },
      {
        id: "workspace-selector",
        title: "Switch workspaces safely",
        description:
          "Move between projects from this selector. It updates API context so actions run in the selected workspace.",
        targetSelector: '[data-tour=\"project-switcher\"]',
        optional: !canManageWorkspace,
      },
      {
        id: "credits",
        title: "Track credits before running",
        description:
          "Check credit balance here before launch. Open billing to upgrade plans or top up when needed.",
        targetSelector: '[data-tour=\"credits-button\"]',
      },
      {
        id: "account-menu",
        title: "Profile and billing controls",
        description:
          "Open the account menu to access profile settings, project management, and billing controls.",
        targetSelector: '[data-tour=\"account-menu\"]',
      },
    ].filter((step) => !step.optional);
  }, [authSession?.permissions.can_manage_workspace]);

  const currentStep = steps[stepIndex] ?? steps[0];
  const isLastStep = stepIndex >= steps.length - 1;

  const markTourCompleted = useCallback(() => {
    if (!authSession || typeof window === "undefined") {
      setOpen(false);
      return;
    }
    window.localStorage.setItem(storageKeyForSession(authSession), "done");
    setOpen(false);
  }, [authSession]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !authSession || authSession.is_super_admin || typeof window === "undefined") return;

    const shouldForceOpen = searchParams.get("tour") === "1";
    if (shouldForceOpen) {
      setStepIndex(0);
      setOpen(true);
      return;
    }

    const hasCompletedTour = window.localStorage.getItem(storageKeyForSession(authSession)) === "done";
    if (!hasCompletedTour) {
      setStepIndex(0);
      setOpen(true);
    }
  }, [
    authSession,
    authSession?.is_super_admin,
    authSession?.project_id,
    authSession?.tenant_id,
    authSession?.user_id,
    hydrated,
    searchParams,
  ]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    const onOpenRequested = () => {
      setStepIndex(0);
      setOpen(true);
    };

    window.addEventListener(NEW_USER_TOUR_OPEN_EVENT, onOpenRequested);
    return () => {
      window.removeEventListener(NEW_USER_TOUR_OPEN_EVENT, onOpenRequested);
    };
  }, [hydrated]);

  const resolveTarget = useCallback(() => {
    if (!open || !currentStep?.targetSelector || typeof document === "undefined") {
      setTargetRect(null);
      return;
    }
    const node = document.querySelector(currentStep.targetSelector);
    if (!(node instanceof HTMLElement)) {
      setTargetRect(null);
      return;
    }
    setTargetRect(node.getBoundingClientRect());
  }, [currentStep?.targetSelector, open]);

  useEffect(() => {
    if (!open) return;
    resolveTarget();
    const timer = window.setTimeout(resolveTarget, 130);
    const listener = () => resolveTarget();
    window.addEventListener("resize", listener);
    window.addEventListener("scroll", listener, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", listener);
      window.removeEventListener("scroll", listener, true);
    };
  }, [open, resolveTarget, stepIndex]);

  function handlePrevStep() {
    setStepIndex((value) => Math.max(0, value - 1));
  }

  function handleNextStep() {
    if (isLastStep) {
      markTourCompleted();
      return;
    }
    setStepIndex((value) => Math.min(steps.length - 1, value + 1));
  }

  function handleSkip() {
    markTourCompleted();
  }

  if (!hydrated || !open || !authSession || authSession.is_super_admin || steps.length === 0) {
    return null;
  }

  const cardStyle: CSSProperties = {};
  if (targetRect) {
    const width = Math.min(360, window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = clamp(targetRect.left, VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const belowTop = targetRect.bottom + 14;
    const aboveTop = targetRect.top - ESTIMATED_CARD_HEIGHT - 14;
    const topCandidate =
      belowTop + ESTIMATED_CARD_HEIGHT <= window.innerHeight - VIEWPORT_MARGIN
        ? belowTop
        : aboveTop >= VIEWPORT_MARGIN
          ? aboveTop
          : VIEWPORT_MARGIN;
    cardStyle.left = left;
    cardStyle.top = topCandidate;
    cardStyle.width = width;
  } else {
    cardStyle.left = "50%";
    cardStyle.top = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
    cardStyle.width = "min(92vw, 360px)";
  }

  const spotlightStyle: CSSProperties | null = targetRect
    ? {
        top: Math.max(targetRect.top - 8, 4),
        left: Math.max(targetRect.left - 8, 4),
        width: targetRect.width + 16,
        height: targetRect.height + 16,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1.5px]" />

      {spotlightStyle ? (
        <div
          className="pointer-events-none absolute z-[121] rounded-2xl border border-primary/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.55),0_0_32px_hsl(var(--primary)/0.35)]"
          style={spotlightStyle}
        />
      ) : null}

      <div
        className="absolute z-[122] rounded-2xl border border-border/80 bg-card/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Product Tour
            </p>
            <h3 className="mt-2 text-base font-semibold text-foreground">{currentStep.title}</h3>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-md border border-border/70 p-1.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">{currentStep.description}</p>
        {currentStep.targetSelector && !targetRect ? (
          <p className="mt-2 text-xs text-muted-foreground/85">
            This control may be hidden on your current layout size. Continue to the next step.
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {steps.length}
          </span>
          <span>{Math.round(((stepIndex + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/70">
          <div
            className="h-full rounded-full bg-primary transition-all duration-200"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevStep} disabled={stepIndex === 0}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <Button size="sm" onClick={handleNextStep}>
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep ? <ArrowRight className="h-3.5 w-3.5" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

