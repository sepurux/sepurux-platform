import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AccentTone = "violet" | "blue" | "emerald" | "amber";

const accentToneClasses: Record<AccentTone, string> = {
  violet:
    "border-violet-300/70 bg-[linear-gradient(180deg,rgba(224,231,255,0.95),rgba(196,181,253,0.6))] text-violet-700 shadow-[0_10px_24px_rgba(124,58,237,0.16),inset_0_1px_0_rgba(255,255,255,0.92)] dark:border-violet-400/20 dark:bg-[linear-gradient(180deg,rgba(99,102,241,0.34),rgba(67,56,202,0.18))] dark:text-violet-200 dark:shadow-[0_10px_24px_rgba(67,56,202,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]",
  blue:
    "border-sky-300/70 bg-[linear-gradient(180deg,rgba(224,242,254,0.98),rgba(186,230,253,0.62))] text-sky-700 shadow-[0_10px_24px_rgba(14,116,144,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] dark:border-sky-400/20 dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.32),rgba(37,99,235,0.18))] dark:text-sky-200 dark:shadow-[0_10px_24px_rgba(37,99,235,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]",
  emerald:
    "border-emerald-300/70 bg-[linear-gradient(180deg,rgba(209,250,229,0.98),rgba(167,243,208,0.62))] text-emerald-700 shadow-[0_10px_24px_rgba(5,150,105,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] dark:border-emerald-400/20 dark:bg-[linear-gradient(180deg,rgba(52,211,153,0.28),rgba(6,95,70,0.18))] dark:text-emerald-200 dark:shadow-[0_10px_24px_rgba(5,150,105,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]",
  amber:
    "border-amber-300/70 bg-[linear-gradient(180deg,rgba(254,243,199,0.98),rgba(253,230,138,0.62))] text-amber-700 shadow-[0_10px_24px_rgba(217,119,6,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] dark:border-amber-400/20 dark:bg-[linear-gradient(180deg,rgba(251,191,36,0.32),rgba(180,83,9,0.18))] dark:text-amber-200 dark:shadow-[0_10px_24px_rgba(217,119,6,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]",
};

const accentBadgeClasses: Record<AccentTone, string> = {
  violet:
    "border-violet-300/75 bg-violet-50 text-violet-700 dark:border-violet-400/12 dark:bg-violet-500/12 dark:text-violet-200",
  blue:
    "border-sky-300/75 bg-sky-50 text-sky-700 dark:border-sky-400/12 dark:bg-sky-500/12 dark:text-sky-200",
  emerald:
    "border-emerald-300/75 bg-emerald-50 text-emerald-700 dark:border-emerald-400/12 dark:bg-emerald-500/12 dark:text-emerald-200",
  amber:
    "border-amber-300/75 bg-amber-50 text-amber-700 dark:border-amber-400/12 dark:bg-amber-500/12 dark:text-amber-200",
};

type DataTableHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: AccentTone;
  badge?: string;
  className?: string;
};

export function DataTableHeader({
  icon: Icon,
  title,
  description,
  accent = "blue",
  badge,
  className,
}: DataTableHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-start md:justify-between", className)}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border",
            accentToneClasses[accent]
          )}
        >
          <div className="absolute inset-[1px] rounded-[16px] bg-white/40 dark:bg-white/[0.02]" />
          <Icon className="relative z-10 h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-foreground">
            {title}
          </h2>
          <p className="max-w-2xl text-[15px] leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {badge ? (
        <div
          className={cn(
            "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            accentBadgeClasses[accent]
          )}
        >
          {badge}
        </div>
      ) : null}
    </div>
  );
}
