import { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Lifecycle App | David Wolfe",
  description: "Lifecycle workspace for signal-driven campaign simulation, scoring, and revenue-oriented operator workflows.",
  path: "/lifecycle"
});

export default function LifecycleRootPage() {
  redirect("/lifecycle/overview");
}
