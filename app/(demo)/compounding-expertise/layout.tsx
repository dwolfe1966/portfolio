import React from "react";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";

export default async function CompoundingExpertiseLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoAppShell app="compounding-expertise">
      {children}
    </DemoAppShell>
  );
}
