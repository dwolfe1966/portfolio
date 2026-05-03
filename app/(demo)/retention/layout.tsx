import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";

export default function RetentionLayout({ children }: { children: React.ReactNode }) {
  return <DemoAppShell app="retention">{children}</DemoAppShell>;
}
