import { Suspense, type ReactNode } from "react";

import { ShellFrame } from "@/components/layout/shell-frame";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="app-shell-backdrop faint-grid flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
          Loading debugger...
        </div>
      }
    >
      <ShellFrame>{children}</ShellFrame>
    </Suspense>
  );
}
