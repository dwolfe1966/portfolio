import React from "react";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <DemoAppShell app="pricing">{children}</DemoAppShell>;
}
