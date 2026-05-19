"use client";

import { useFormStatus } from "react-dom";

type ProviderOperationSubmitProps = {
  children: React.ReactNode;
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
