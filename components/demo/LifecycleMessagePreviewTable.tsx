"use client";

import { useEffect, useState } from "react";

type LifecycleMessagePreview = {
  id: string;
  userName: string;
  entityName: string;
  entityType: string;
  changeType: string;
  deltaSummary: string;
  subjectLine: string;
  previewText: string;
  emailBody: string;
  landingHeadline: string;
  landingBody: string;
  ctaText: string;
  modelName: string;
};

export function LifecycleMessagePreviewTable({ messages }: { messages: LifecycleMessagePreview[] }) {
  const [selected, setSelected] = useState<LifecycleMessagePreview | null>(null);

  useEffect(() => {
    if (!selected) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  if (messages.length === 0) {
    return <div className="card"><p>No generated messages yet. Run a lifecycle simulation to create OpenAI-generated message assets.</p></div>;
  }

  return (
    <>
      <table className="table">
        <thead><tr><th>User</th><th>Entity</th><th>Subject</th><th>Model</th><th>Preview</th></tr></thead>
        <tbody>
          {messages.map((message) => (
            <tr key={message.id}>
              <td>{message.userName}</td>
              <td>{message.entityName}</td>
              <td>{message.subjectLine}</td>
              <td><code className="small">{message.modelName}</code></td>
              <td>
                <button type="button" className="btn smallBtn" onClick={() => setSelected(message)}>
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <div
            className="messagePreviewModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="message-preview-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <p className="small">OpenAI-generated lifecycle message</p>
                <h3 id="message-preview-title">{selected.subjectLine}</h3>
              </div>
              <button type="button" className="btn smallBtn" onClick={() => setSelected(null)}>Close</button>
            </div>

            <div className="grid grid-2" style={{ gap: 14, marginTop: 14 }}>
              <div className="card compact">
                <h3>Email message</h3>
                <p className="small">Recipient</p>
                <p>{selected.userName}</p>
                <p className="small" style={{ marginTop: 10 }}>Subject</p>
                <p><strong>{selected.subjectLine}</strong></p>
                <p className="small" style={{ marginTop: 10 }}>Preview text</p>
                <p>{selected.previewText}</p>
                <p className="small" style={{ marginTop: 10 }}>Body</p>
                <p>{selected.emailBody}</p>
              </div>

              <div className="landingPreviewSurface">
                <p className="small">Customized landing page preview</p>
                <h2>{selected.landingHeadline}</h2>
                <p>{selected.landingBody}</p>
                <div className="landingPreviewFacts">
                  <div>
                    <span className="small">User</span>
                    <strong>{selected.userName}</strong>
                  </div>
                  <div>
                    <span className="small">Tracked entity</span>
                    <strong>{selected.entityName}</strong>
                  </div>
                  <div>
                    <span className="small">Signal</span>
                    <strong>{selected.changeType.replaceAll("_", " ")}</strong>
                  </div>
                </div>
                <p className="small" style={{ marginTop: 12 }}>{selected.deltaSummary}</p>
                <a className="btn primary" href={`/demo/landing/${selected.id}`}>{selected.ctaText}</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
