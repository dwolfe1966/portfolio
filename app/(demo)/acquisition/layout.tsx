import React from "react";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";

export default function AcquisitionLayout({ children }: { children: React.ReactNode }) {
  return <DemoAppShell app="acquisition">{children}</DemoAppShell>;
}
