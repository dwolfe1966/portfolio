import React from "react";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";

export default function CompoundingExpertiseLayout({ children }: { children: React.ReactNode }) {
  return <DemoAppShell app="compounding-expertise">{children}</DemoAppShell>;
}
