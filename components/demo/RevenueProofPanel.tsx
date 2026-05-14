import Link from "next/link";
import type { RevenueProofDashboard } from "@/lib/revenue-proof-dashboard";

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function RevenueProofPanel({ proof }: { proof: RevenueProofDashboard }) {
  return (
    <div className="grid grid-2">
      <div className="card">
        <p className={`statusPill ${proof.status === "ready" ? "live" : proof.status === "blocked" ? "warning" : "progress"}`}>
          {statusLabel(proof.status)}
        </p>
        <h3 style={{ marginTop: 10 }}>{proof.baselineLabel}</h3>
        <p className="small">
          {proof.treatmentPopulation.toLocaleString()} treatment · {proof.controlPopulation.toLocaleString()} control · {statusLabel(proof.confidence)} confidence
        </p>
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          {proof.metrics.map((metric) => (
            <div className="revenueProofMetric" key={metric.label}>
              <p className="small">{metric.label}</p>
              <div className="kpi">{metric.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Evidence chain</h3>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div>
            <p className="small">Agent actions</p>
            {proof.actions.length > 0 ? (
              <ul className="cleanList">
                {proof.actions.slice(0, 4).map((action) => (
                  <li key={action.id}>
                    {action.auditUrl ? <Link href={action.auditUrl}>{action.label}</Link> : action.label}
                    <span className="small"> · {statusLabel(action.status ?? "attached")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small">No actions attached.</p>
            )}
          </div>
          <div>
            <p className="small">Exports</p>
            {proof.exportLinks.length > 0 ? (
              <ul className="cleanList">
                {proof.exportLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                    {link.evidenceType ? <span className="small"> · {statusLabel(link.evidenceType)}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small">No exports linked.</p>
            )}
          </div>
        </div>
        {proof.blockers.length > 0 || proof.confidenceFlags.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <p className="small">Confidence flags</p>
            <ul className="cleanList">
              {[...proof.blockers, ...proof.confidenceFlags].slice(0, 5).map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
