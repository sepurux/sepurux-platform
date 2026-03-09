import { Suspense, type ReactNode } from "react";

import { ShellFrame } from "@/components/layout/shell-frame";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="faint-grid flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">
          Loading workspace...
        </div>
      }
    >
      <ShellFrame>{children}</ShellFrame>
    </Suspense>
  );
}
