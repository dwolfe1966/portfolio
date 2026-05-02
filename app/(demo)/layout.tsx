import React from "react";

export default function DemoGroupLayout({ children }: { children: React.ReactNode }) {
  // The actual shell (DemoAppShell) is applied by each app's layout below.
  // This wrapper exists so we can opt the demo route group out of marketing
  // chrome cleanly and add cross-app concerns later (e.g., session-scoped
  // status providers) without touching every app layout.
  return <>{children}</>;
}
