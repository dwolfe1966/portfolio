"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "lifecycle_first_run_intro_dismissed_v1";

export function LifecycleFirstRunIntro() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem(STORAGE_KEY) !== "true");
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="introOverlay" role="dialog" aria-modal="true" aria-labelledby="lifecycle-intro-title">
      <div className="introDialog">
        <p className="eyebrow">Lifecycle workspace</p>
        <h2 id="lifecycle-intro-title">Start with inputs, run a simulation, then inspect outputs</h2>
        <div className="grid grid-3">
          <div>
            <h3>1. Inputs</h3>
            <p>Review assumptions, scoring thresholds, sample users, and tracked entities.</p>
          </div>
          <div>
            <h3>2. Simulations</h3>
            <p>Generate fresh events, score opportunities, and create campaign messages.</p>
          </div>
          <div>
            <h3>3. Outputs</h3>
            <p>Validate runs, candidates, messages, revenue estimates, and audit context.</p>
          </div>
        </div>
        <div className="ctaRow">
          <Link className="btn primary" href="/lifecycle/inputs" onClick={dismiss}>Start at inputs</Link>
          <button type="button" onClick={dismiss}>Continue here</button>
        </div>
      </div>
    </div>
  );
}
