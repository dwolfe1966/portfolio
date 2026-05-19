"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

type ProviderOperationSubmitProps = {
  children: ReactNode;
  pendingLabel: string;
  pendingDetail: string;
  disabled?: boolean;
  className?: string;
};

export function ProviderOperationSubmit({
  children,
  pendingLabel,
  pendingDetail,
  disabled,
  className = "btn"
}: ProviderOperationSubmitProps) {
  const { pending } = useFormStatus();
  return (
    <>
      <button className={className} type="submit" disabled={disabled || pending} aria-busy={pending}>
        {pending ? pendingLabel : children}
      </button>
      {pending ? (
        <div className="providerOperationBar" role="status" aria-live="polite">
          <div className="providerOperationSpinner" aria-hidden="true" />
          <div>
            <strong>{pendingLabel}</strong>
            <p>{pendingDetail}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

type ProviderOperationLinkProps = {
  children: ReactNode;
  href: string;
  pendingLabel: string;
  pendingDetail: string;
  className?: string;
  rel?: string;
};

export function ProviderOperationLink({
  children,
  href,
  pendingLabel,
  pendingDetail,
  className = "btn",
  rel
}: ProviderOperationLinkProps) {
  const [pending, setPending] = useState(false);
  return (
    <>
      <a className={className} href={href} rel={rel} aria-busy={pending} onClick={() => setPending(true)}>
        {pending ? pendingLabel : children}
      </a>
      {pending ? (
        <div className="providerOperationBar" role="status" aria-live="polite">
          <div className="providerOperationSpinner" aria-hidden="true" />
          <div>
            <strong>{pendingLabel}</strong>
            <p>{pendingDetail}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
