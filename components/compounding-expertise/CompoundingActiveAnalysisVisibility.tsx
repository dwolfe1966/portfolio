"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function CompoundingActiveAnalysisVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/compounding-expertise/overview") return null;
  return <>{children}</>;
}
