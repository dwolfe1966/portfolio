import React from "react";
import { AppWorkspaceShellNav } from "@/components/site/AppWorkspaceShellNav";
import { LifecycleFirstRunIntro } from "@/components/demo/LifecycleFirstRunIntro";

export default function LifecycleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="appExperience appExperienceLifecycle">
      <LifecycleFirstRunIntro />
      <AppWorkspaceShellNav app="lifecycle" />
      <div className="appExperienceContent">{children}</div>
    </div>
  );
}
