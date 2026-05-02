import React from "react";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";

export default function AuctionLayout({ children }: { children: React.ReactNode }) {
  return <DemoAppShell app="auction">{children}</DemoAppShell>;
}
