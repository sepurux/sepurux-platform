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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && tabs.some((t) => t.lang === stored)) {
      setActive(stored);
    }
  }, [tabs]);

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
    <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[var(--ink-925)] shadow-[0_18px_44px_rgba(6,8,12,0.14)]">
      <div className="flex gap-0.5 border-b border-white/8 bg-white/[0.03] px-2 pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.lang}
            type="button"
            onClick={() => select(tab.lang)}
            className={[
              "rounded-t-md border-b-2 px-3 pb-2 pt-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors",
              active === tab.lang
                ? "border-[--color-accent] text-white"
                : "border-transparent text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-slate-200 md:px-5 md:py-5">
        <code>{current?.code}</code>
      </pre>
    </div>
  );
}
