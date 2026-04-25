import React from "react";
import { AppWorkspaceShellNav } from "@/components/site/AppWorkspaceShellNav";

export default function AcquisitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="appExperience appExperienceAcquisition">
      <AppWorkspaceShellNav app="acquisition" />
      <div className="appExperienceContent">{children}</div>
    </div>
  );
}
