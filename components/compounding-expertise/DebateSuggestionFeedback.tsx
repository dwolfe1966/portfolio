"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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

export function DebatePanel({ family, sections = [], title, description, kind, children }: {
  family: string; sections?: DebateReviewSection[]; title: string; description: string;
  kind: "evidence" | "argument" | "assessment"; children: ReactNode;
}) {
  const { changes, showHighlights } = useContext(FeedbackContext);
  const changed = showHighlights && Boolean(changes.find((item) => item.family === family)?.sections.some((section) => sections.includes(section)));
  const [open, setOpen] = useState(false);
  useEffect(() => { if (changed) setOpen(true); }, [changed]);
  return <details className={`compoundingDetailPanel compoundingDetailPanel-${kind}`} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>
      <span className="compoundingPanelHeading"><strong>{title}</strong><span className="small">{description}</span></span>
      {changed ? <span className="miniTag compoundingChangedBadge">Updated · review</span> : null}
    </summary>
    <div className="compoundingPanelBody">{children}</div>
  </details>;
}

const EditorContext = createContext<{
  family: string; open: boolean; toggle: () => void; close: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>; panelRef: RefObject<HTMLDivElement | null>;
} | null>(null);

function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error("Debate editor must be inside a DebateCard.");
  return context;
}

export function DebateCard({ family, children }: { family: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusEditor = useRef(false);
  const changed = useChanged(family, "editor");
  useEffect(() => { if (changed) setOpen(true); }, [changed]);
  useEffect(() => {
    if (open && focusEditor.current) {
      panelRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      focusEditor.current = false;
    }
  }, [open]);
  function close() { setOpen(false); buttonRef.current?.focus(); }
  function toggle() {
    if (open) close();
    else { focusEditor.current = true; setOpen(true); }
  }
  return <EditorContext.Provider value={{ family, open, toggle, close, buttonRef, panelRef }}>
    <article className="card compoundingDebateCard compoundingDebateAnalysisCard" id={`debate-${family}`}>{children}</article>
  </EditorContext.Provider>;
}

export function DebateEditButton() {
  const { family, open, toggle, buttonRef } = useEditor();
  return <button ref={buttonRef} className="btn compoundingEditDebateButton" type="button" aria-expanded={open} aria-controls={`debate-change-${family}-editor`} onClick={toggle}>
    {open ? "Close editor" : "Edit debate"}
  </button>;
}

export function DebateEditor({ children }: { children: ReactNode }) {
  const { family, open, close, panelRef } = useEditor();
  const changed = useChanged(family, "editor");
  // Keep closed editor inputs mounted: the enclosing form saves all debates.
  return <div ref={panelRef} hidden={!open} id={`debate-change-${family}-editor`} role="region" aria-labelledby={`debate-editor-title-${family}`}
    className={`compoundingDebateEditor${changed ? " compoundingAIChanged" : ""}`} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
    <div className="compoundingCardHeader">
      <h4 id={`debate-editor-title-${family}`}>Edit debate</h4>
      <button className="btn" type="button" onClick={close}>Close editor</button>
    </div>
    {changed ? <span className="miniTag compoundingChangedBadge">Changed after AI suggestion</span> : null}
    {children}
    <button className="btn primary" type="submit">Save debate edits</button>
  </div>;
}

export function DebateEditingRegion({ children }: { children: ReactNode }) {
  const { pending } = useContext(FeedbackContext);
  return <fieldset className="compoundingDebateEditingRegion" disabled={pending} aria-busy={pending}>{children}</fieldset>;
}
