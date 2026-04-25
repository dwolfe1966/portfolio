import React from "react";
import { AppWorkspaceShellNav } from "@/components/site/AppWorkspaceShellNav";

export default function LifecycleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="appExperience appExperienceLifecycle">
      <AppWorkspaceShellNav app="lifecycle" />
      <div className="appExperienceContent">{children}</div>
    </div>
  );
}
