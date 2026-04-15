"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Bug,
  Clock3,
  Globe,
  ImagePlus,
  Loader2,
  Monitor,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, type AuthSessionMetadata, type BugReportCategory } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  authSession: AuthSessionMetadata | null;
  onClose: () => void;
};

type CapturedInfo = {
  pageUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  reportedAtIso: string;
  reportedAtLabel: string;
};

const categories: Array<{
  id: BugReportCategory;
  label: string;
  helper: string;
}> = [
  {
    id: "platform",
    label: "UI & Navigation",
    helper: "Layout, styling, responsiveness, or broken page interactions",
  },
  {
    id: "project",
    label: "Campaign & Runs",
    helper: "Run setup, CI batch decisions, campaign flow, or replay behavior",
  },
  {
    id: "taxonomy",
    label: "Traces & Packs",
    helper: "Trace ingestion, check configuration, or guardrail alignment",
  },
  {
    id: "task",
    label: "Account & Access",
    helper: "Auth, workspace membership, billing, permissions, or role access",
  },
];

export function ReportBugModal({ authSession, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState<BugReportCategory>("platform");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capturedInfo, setCapturedInfo] = useState<CapturedInfo>({
    pageUrl: "",
    viewportWidth: 0,
    viewportHeight: 0,
    reportedAtIso: new Date().toISOString(),
    reportedAtLabel: "",
  });

  const reporterLabel = authSession?.name || authSession?.email || "Workspace user";
  const roleLabel = authSession?.role_name || "User";

  useEffect(() => {
    const now = new Date();
    setCapturedInfo({
      pageUrl: window.location.href,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      reportedAtIso: now.toISOString(),
      reportedAtLabel: new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now),
    });
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, submitting]);

  const descriptionCount = useMemo(() => description.trim().length, [description]);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the screenshot.");
      return;
    }
    if (file.size > 2_500_000) {
      setError("Choose a screenshot under 2.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("Could not read the screenshot.");
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : null;
      if (!value?.startsWith("data:image/")) {
        setError("Could not load that screenshot.");
        return;
      }
      setScreenshotDataUrl(value);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (normalizedTitle.length < 3) {
      setError("Add a short title for the issue.");
      return;
    }
    if (normalizedDescription.length < 10) {
      setError("Add more detail so support can reproduce the issue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.submitBugReport({
        category,
        title: normalizedTitle,
        description: normalizedDescription,
        page_url: capturedInfo.pageUrl,
        reported_at: capturedInfo.reportedAtIso,
        viewport_width: capturedInfo.viewportWidth,
        viewport_height: capturedInfo.viewportHeight,
        screenshot_data_url: screenshotDataUrl,
      });
      setSuccess(response.message);
      window.setTimeout(() => {
        onClose();
      }, 700);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Failed to submit bug report."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === backdropRef.current && !submitting) {
          onClose();
        }
      }}
    >
      <div className="panel-surface w-full max-w-2xl overflow-hidden rounded-[24px] border border-border/80 bg-[hsl(var(--card)/0.96)] backdrop-blur-2xl">
        <div className="flex items-start justify-between border-b border-border/70 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(180deg,rgba(249,115,22,0.95),rgba(251,146,60,0.88))] text-white shadow-[0_12px_30px_rgba(249,115,22,0.3)]">
              <Bug className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Report a Bug</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Administrators will be notified
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close report bug dialog"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-[#d7843b]/12 hover:text-[#d7843b]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-border/70 bg-card/45 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Automatically captured information
            </p>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <InfoRow icon={UserRound} label={`${reporterLabel} (${roleLabel})`} />
              <InfoRow icon={Clock3} label={capturedInfo.reportedAtLabel || "Preparing timestamp..."} />
              <InfoRow icon={Globe} label={capturedInfo.pageUrl || "Preparing page URL..."} />
              <InfoRow
                icon={Monitor}
                label={
                  capturedInfo.viewportWidth > 0
                    ? `${capturedInfo.viewportWidth}x${capturedInfo.viewportHeight}`
                    : "Preparing viewport..."
                }
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Category <span className="text-rose-400">*</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((item) => {
                const active = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition-all duration-150",
                      active
                        ? "border-[#d7843b]/70 bg-[#d7843b]/14 shadow-[0_0_0_1px_rgba(215,132,59,0.35)]"
                        : "border-border/70 bg-card/35 hover:border-[#d7843b]/45 hover:bg-[#d7843b]/10"
                    )}
                  >
                    <p className={cn("text-sm font-semibold", active ? "text-[#d7843b]" : "text-foreground")}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="bug-report-title" className="text-sm font-medium text-foreground">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              id="bug-report-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Brief description of the issue..."
              className="h-11 w-full rounded-2xl border border-border/70 bg-card/40 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-[#d7843b]/70"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bug-report-description" className="text-sm font-medium text-foreground">
              Detailed description <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="bug-report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 5000))}
              rows={5}
              placeholder="Describe the issue in as much detail as possible: what you were doing, what you expected to happen, what actually happened..."
              className="min-h-[140px] w-full rounded-2xl border border-border/70 bg-card/40 px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-[#d7843b]/70"
            />
            <div className="text-right text-xs text-muted-foreground">{descriptionCount}/5000</div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Screenshot</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null)}
            />
            {screenshotDataUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/40">
                <img
                  src={screenshotDataUrl}
                  alt="Bug report screenshot preview"
                  className="block max-h-[220px] w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove screenshot"
                  onClick={() => {
                    setScreenshotDataUrl(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#d7843b] text-white shadow-lg transition-colors hover:bg-[#e29a57]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[112px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/75 bg-card/35 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-[#d7843b]/60 hover:bg-[#d7843b]/8 hover:text-[#d7843b]"
              >
                <ImagePlus className="h-4 w-4" />
                Add screenshot
              </button>
            )}
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/70 px-5 py-4 sm:px-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border-[#d7843b]/45 text-[#d7843b] hover:bg-[#d7843b]/10 hover:text-[#d7843b]"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="min-w-[148px] rounded-2xl bg-[linear-gradient(180deg,rgba(249,115,22,0.98),rgba(245,130,48,0.94))] text-white shadow-[0_0_0_1px_rgba(215,132,59,0.4),0_14px_30px_rgba(215,132,59,0.32)] hover:brightness-110"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit report
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function InfoRow({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/90" />
      <p className="truncate">{label}</p>
    </div>
  );
}
