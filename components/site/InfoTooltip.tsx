"use client";

import type { ReactNode } from "react";

type InfoTooltipProps = {
  label: string;
  children: ReactNode;
};

export function InfoTooltip({ label, children }: InfoTooltipProps) {
  return (
    <span className="infoTooltip">
      <button className="infoTooltipButton" type="button" aria-label={label}>
        ?
      </button>
      <span className="infoTooltipBubble" role="tooltip">
        {children}
      </span>
    </span>
  );
}
