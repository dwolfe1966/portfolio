import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";

export default function ExpansionLayout({ children }: { children: React.ReactNode }) {
  return <DemoAppShell app="expansion">{children}</DemoAppShell>;
}
