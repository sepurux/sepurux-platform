"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sepurux-docs-lang";

export type DocsTab = {
  lang: string;
  label: string;
  code: string;
};

export function DocsCodeTabs({ tabs }: { tabs: DocsTab[] }) {
  const [active, setActive] = useState<string>(() => tabs[0]?.lang ?? "");

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && tabs.some((t) => t.lang === stored)) {
      setActive(stored);
    }
  }, [tabs]);

  // Sync with other DocsCodeTabs instances on the same page
  useEffect(() => {
    function onLangChange(e: Event) {
      const lang = (e as CustomEvent<string>).detail;
      if (tabs.some((t) => t.lang === lang)) setActive(lang);
    }
    window.addEventListener("sepurux-lang-change", onLangChange);
    return () => window.removeEventListener("sepurux-lang-change", onLangChange);
  }, [tabs]);

  function select(lang: string) {
    setActive(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent<string>("sepurux-lang-change", { detail: lang }));
  }

  const current = tabs.find((t) => t.lang === active) ?? tabs[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-white/10 bg-white/[0.03] px-2 pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.lang}
            type="button"
            onClick={() => select(tab.lang)}
            className={[
              "rounded-t-md px-3 pb-2 pt-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors",
              active === tab.lang
                ? "border-b-2 border-teal-400 text-white"
                : "border-b-2 border-transparent text-white/40 hover:text-white/70",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Code */}
      <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-neutral-200 md:px-5 md:py-5">
        <code>{current?.code}</code>
      </pre>
    </div>
  );
}
