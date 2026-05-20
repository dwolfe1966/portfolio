"use client";

import { ConnectionDisconnectButton } from "@/components/acquisition/ConnectionDisconnectButton";
import { ConnectionVisibilityButton } from "@/components/acquisition/ConnectionVisibilityButton";
import { ProviderOperationLink } from "@/components/acquisition/ProviderOperationSubmit";

export function ConnectionRowActions({
  id,
  hidden,
  label
}: {
  id: string;
  hidden: boolean;
  label: string;
}) {
  return (
    <div className="rowActionCluster">
      <ProviderOperationLink
        className="btn smallBtn primary"
        href={`/acquisition/connections/${id}`}
        pendingLabel="Opening provider account"
        pendingDetail="Loading provider campaigns, ad groups or ad sets, ads, and recent performance."
      >
        Open
      </ProviderOperationLink>
      <details className="rowActionMenu">
        <summary className="btn smallBtn" aria-label={`More actions for ${label}`}>Actions</summary>
        <div className="rowActionMenuPanel">
          <ConnectionVisibilityButton id={id} hidden={hidden} />
          <ConnectionDisconnectButton id={id} label={label} />
        </div>
      </details>
    </div>
  );
}
