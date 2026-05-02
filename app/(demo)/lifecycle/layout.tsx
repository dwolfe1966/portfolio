import React from "react";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";
import { LifecycleFirstRunIntro } from "@/components/demo/LifecycleFirstRunIntro";

export default function LifecycleLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoAppShell app="lifecycle">
      <LifecycleFirstRunIntro />
      {children}
    </DemoAppShell>
  );
}
