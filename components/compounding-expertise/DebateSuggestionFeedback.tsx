"use client";

import { createContext, useActionState, useContext, useState, type ReactNode } from "react";
import {
  changedDebateSections,
  type DebateReviewSection,
  type DebateReviewSnapshot,
  type DebateSuggestionResult
} from "@/lib/debate-suggestion-feedback";

const FeedbackContext = createContext({
  pending: false,
  changes: [] as ReturnType<typeof changedDebateSections>,
  showHighlights: false
});

export function DebateSuggestionFeedback({ snapshots, children, action, analysisId }: {
  snapshots: DebateReviewSnapshot[];
  children: ReactNode;
  action: (formData: FormData) => Promise<DebateSuggestionResult>;
  analysisId: string;
}) {
  const [before, setBefore] = useState<DebateReviewSnapshot[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [result, submit, pending] = useActionState<DebateSuggestionResult, FormData>(async (_previous, formData) => {
    try {
      return await action(formData);
    } catch {
      return { status: "error", message: "The request could not be completed. Refresh to check the saved debates before retrying." };
    }
  }, { status: "idle" });
  const changes = result.status === "success" ? changedDebateSections(before, snapshots) : [];
  const removed = result.status === "success" ? before.filter((old) => !snapshots.some((item) => item.family === old.family)) : [];
  const first = changes[0];

  return (
    <FeedbackContext.Provider value={{ pending, changes, showHighlights: !pending && !dismissed && result.status === "success" }}>
      <form action={submit} className="compoundingSuggestionControls" onSubmit={() => { setBefore(snapshots); setDismissed(false); }}>
        <input type="hidden" name="analysisId" value={analysisId} />
        <div className="ctaRow">
          <button className="btn" type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Suggesting debates…" : "Suggest debates with AI"}
          </button>
          <span className="small">Optional. AI suggestions are not evidence. Generating replaces the saved debate suggestions; save any edits first.</span>
        </div>
        <div role="status" aria-live="polite" aria-atomic="true">
          {pending ? (
            <div className="card compoundingPendingPanel">
              <strong>Suggesting debates…</strong>
              <p>This may take a little while. Keep this page open; changed sections will be marked when the request finishes.</p>
              <div className="compoundingIndeterminateBar" aria-hidden="true"><span /></div>
            </div>
          ) : result.status === "success" ? (
            <div className="card compoundingSuggestionComplete">
              <strong>{result.count} AI suggestions saved.</strong>
              <p>{changes.length
                ? `${changes.length} displayed debate${changes.length === 1 ? " has" : "s have"} changed sections.`
                : "No displayed debate text changed."}{removed.length ? ` ${removed.length} previous debate${removed.length === 1 ? " is" : "s are"} no longer displayed.` : ""}</p>
              <p className="small">AI-generated material is a SUGGESTION — NOT EVIDENCE. Highlighting identifies changes, not stronger evidence.</p>
              {first && !dismissed ? <div className="ctaRow">
                <a className="btn" href={`#debate-change-${first.family}-${first.sections[0]}`}>Review changes</a>
                <button className="btn" type="button" onClick={() => setDismissed(true)}>Dismiss highlights</button>
              </div> : null}
            </div>
          ) : null}
        </div>
        {!pending && result.status === "error" ? <div className="card compoundingSyntheticBanner" role="alert">{result.message}</div> : null}
      </form>
      {children}
    </FeedbackContext.Provider>
  );
}

function useChanged(family: string, section?: DebateReviewSection) {
  const { changes, showHighlights } = useContext(FeedbackContext);
  const change = changes.find((item) => item.family === family);
  return showHighlights && Boolean(change && (!section || change.sections.includes(section)));
}

export function DebateChangedBadge({ family }: { family: string }) {
  return useChanged(family) ? <span className="miniTag compoundingChangedBadge">Updated by AI · review</span> : null;
}

export function DebateChangedSection({ family, section, children, className = "" }: {
  family: string; section: DebateReviewSection; children: ReactNode; className?: string;
}) {
  const changed = useChanged(family, section);
  return <div id={`debate-change-${family}-${section}`} className={`${className}${changed ? " compoundingAIChanged" : ""}`}>
    {changed ? <span className="miniTag compoundingChangedBadge">Changed after AI suggestion</span> : null}
    {children}
  </div>;
}

export function DebateChangedDetails({ family, section, title, children }: {
  family: string; section: DebateReviewSection; title: string; children: ReactNode;
}) {
  const changed = useChanged(family, section);
  return <details id={`debate-change-${family}-${section}`} className={`compoundingInlineEditor${changed ? " compoundingAIChanged" : ""}`} open={changed || undefined}>
    <summary>{title}{changed ? <span className="miniTag compoundingChangedBadge">Changed after AI suggestion</span> : null}</summary>
    {children}
  </details>;
}

export function DebateEditingRegion({ children }: { children: ReactNode }) {
  const { pending } = useContext(FeedbackContext);
  return <fieldset className="compoundingDebateEditingRegion" disabled={pending} aria-busy={pending}>{children}</fieldset>;
}
