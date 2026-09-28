"use client";

import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";

type PendingContextValue = {
  pending: boolean;
};

const PendingContext = createContext<PendingContextValue>({ pending: false });

export function StressTestRunForm({
  action,
  className,
  children,
  method = "get"
}: {
  action: string;
  className?: string;
  children: ReactNode;
  method?: "get" | "post";
}) {
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (submitter?.dataset.runStressTest === "true") setPending(true);
  }

  return (
    <PendingContext.Provider value={{ pending }}>
      <form method={method} action={action} className={className} onSubmit={handleSubmit}>
        {children}
      </form>
    </PendingContext.Provider>
  );
}

export function StressTestRunButton() {
  const { pending } = useContext(PendingContext);
  return (
    <button
      className="btn primary"
      type="submit"
      disabled={pending}
      aria-busy={pending}
      data-run-stress-test="true"
    >
      {pending ? "Running..." : "Run Stress Test"}
    </button>
  );
}

export function StressTestPendingCanvas({
  testName,
  conditionSummary
}: {
  testName: string;
  conditionSummary: string;
}) {
  const { pending } = useContext(PendingContext);
  if (!pending) return null;

  return (
    <div className="card compoundingPendingPanel" role="status" aria-live="polite">
      <span className="badge">Running stress test</span>
      <h3>{testName}</h3>
      <p>Simulating incumbent and challenger trajectories across the 36-month scenario...</p>
      <p className="small">Testing: {conditionSummary}</p>
      <div className="compoundingIndeterminateBar" aria-hidden="true"><span /></div>
    </div>
  );
}
