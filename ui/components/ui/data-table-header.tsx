import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type AccentTone = "violet" | "blue" | "emerald" | "amber";

const accentToneClasses: Record<AccentTone, string> = {
  violet:
    "border-[#f2c08a]/70 bg-[linear-gradient(180deg,rgba(255,246,236,0.98),rgba(253,220,183,0.72))] text-[#8b4b17] shadow-[0_10px_24px_rgba(215,132,59,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] dark:border-[#f2c08a]/25 dark:bg-[linear-gradient(180deg,rgba(64,34,12,0.38),rgba(27,16,9,0.18))] dark:text-[#ffd8b3] dark:shadow-[0_10px_24px_rgba(215,132,59,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]",
  blue:
    "border-[#f4d19d]/70 bg-[linear-gradient(180deg,rgba(255,249,240,0.98),rgba(252,226,187,0.72))] text-[#8b4b17] shadow-[0_10px_24px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(255,255,255,0.94)] dark:border-[#f4d19d]/25 dark:bg-[linear-gradient(180deg,rgba(68,38,15,0.36),rgba(28,16,9,0.18))] dark:text-[#ffe7c7] dark:shadow-[0_10px_24px_rgba(245,158,11,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]",
  emerald:
    "border-emerald-300/70 bg-[linear-gradient(180deg,rgba(209,250,229,0.98),rgba(167,243,208,0.62))] text-emerald-700 shadow-[0_10px_24px_rgba(5,150,105,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] dark:border-emerald-400/20 dark:bg-[linear-gradient(180deg,rgba(52,211,153,0.28),rgba(6,95,70,0.18))] dark:text-emerald-200 dark:shadow-[0_10px_24px_rgba(5,150,105,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]",
  amber:
    "border-[#d7843b]/55 bg-[linear-gradient(180deg,rgba(255,236,215,0.98),rgba(253,218,180,0.72))] text-[#8b4b17] shadow-[0_10px_24px_rgba(215,132,59,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] dark:border-[#d7843b]/45 dark:bg-[linear-gradient(180deg,rgba(215,132,59,0.28),rgba(165,88,20,0.18))] dark:text-[#fff0df] dark:shadow-[0_10px_24px_rgba(215,132,59,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]",
};

const badgeToneClasses: Record<AccentTone, string> = {
  violet:
    "border-[#e9b874]/55 bg-[#fff3e6]/90 text-[#8b4b17] dark:border-[#d7843b]/45 dark:bg-[#d7843b]/30 dark:text-[#fff0df]",
  blue:
    "border-[#f4d19d]/55 bg-[#fff6eb]/90 text-[#8b4b17] dark:border-[#f4d19d]/45 dark:bg-[#f4d19d]/25 dark:text-[#fff0df]",
  emerald:
    "border-emerald-300/55 bg-emerald-100/85 text-emerald-700 dark:border-emerald-400/45 dark:bg-emerald-500/30 dark:text-emerald-100",
  amber:
    "border-[#d7843b]/55 bg-[#fff3e6] text-[#8b4b17] dark:border-[#d7843b]/55 dark:bg-[#d7843b]/30 dark:text-[#fff0df]",
};

type DataTableHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: AccentTone;
  badge?: string;
  className?: string;
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
};

export function DataTableHeader({
  icon: Icon,
  title,
  description,
  accent = "amber",
  badge,
  className,
  collapsible = false,
  isOpen = true,
  onToggle,
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
          <div className="absolute inset-[1px] rounded-[16px] bg-white/45 dark:bg-white/[0.02]" />
          <Icon className="relative z-10 h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-foreground">
            {title}
          </h2>
          <p className="max-w-2xl text-[15px] leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-foreground">
        {badge ? (
          <div
            className={cn(
              "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
              badgeToneClasses[accent]
            )}
          >
            {badge}
          </div>
        ) : null}
        {collapsible ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={isOpen ? "Collapse" : "Expand"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "")}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
