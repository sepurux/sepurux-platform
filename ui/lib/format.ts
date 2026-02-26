export function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDurationMs(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

export function shortId(value: string, head = 8) {
  return value.length <= head ? value : value.slice(0, head);
}

export function titleFromStrategy(strategy: string) {
  return strategy
    .replace(/_/g, " ")
    .replace(/\bv(\d+)\b/g, "V$1")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
