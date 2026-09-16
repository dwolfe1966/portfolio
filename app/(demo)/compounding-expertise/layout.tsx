import React from "react";
import Link from "next/link";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";
import { calculateScorebookMetrics, scorebookRowsAreSynthetic, type ScorebookCaseInput } from "@/lib/compounding-expertise-lab";
import { currentAccountUserId, loadCompoundingAnalysis } from "./data";

function pct(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value * 100)}%`;
}

export default async function CompoundingExpertiseLayout({ children }: { children: React.ReactNode }) {
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId);
  const rows = analysis?.scorebookCases.map((row) => ({ ...row })) as ScorebookCaseInput[] | undefined;
  const metrics = rows ? calculateScorebookMetrics(rows) : null;
  const allSynthetic = rows && rows.length > 0 ? scorebookRowsAreSynthetic(rows) : false;

  return (
    <DemoAppShell app="compounding-expertise">
      <details className="compoundingActiveAnalysisBar" aria-label="Active Compounding Expertise analysis">
        {analysis ? (
          <>
            <summary className="compoundingActiveAnalysisSummary">
              <span>Current analysis</span>
              <strong>{analysis.companyName || "Untitled analysis"}</strong>
            </summary>
            <div className="compoundingActiveAnalysisDetails">
              <div className="compoundingActiveAnalysisMain">
                {analysis.productDescription ? (
                  <p>
                    <strong>Company context:</strong> {analysis.productDescription}
                  </p>
                ) : null}
                <p>
                  <strong>Workflow:</strong>{" "}
                  {analysis.targetCustomer || "Target customer not set"}
                  {analysis.workflow ? ` · ${analysis.workflow.slice(0, 96)}${analysis.workflow.length > 96 ? "..." : ""}` : ""}
                </p>
              </div>
              <div className="compoundingActiveAnalysisFacts">
                <span>{metrics?.totalCases ?? 0} cases</span>
                <span>{pct(metrics?.gradeCoverage ?? null)} grade coverage</span>
                <span className={allSynthetic ? "synthetic" : ""}>
                  {allSynthetic ? "Synthetic fixture" : rows?.length ? "User / sourced rows" : "No scorebook rows"}
                </span>
              </div>
              <div className="compoundingActiveAnalysisActions">
                <Link className="btn" href="/compounding-expertise/inputs">System</Link>
                <Link className="btn" href="/compounding-expertise/scorebook">Scorebook</Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <summary className="compoundingActiveAnalysisSummary">
              <span>No active analysis</span>
              <strong>Choose a company or load an example</strong>
            </summary>
            <div className="compoundingActiveAnalysisDetails">
              <div className="compoundingActiveAnalysisMain">
                <p>The Lab will anchor every step to the selected company and associated scorebook.</p>
              </div>
              <div className="compoundingActiveAnalysisActions">
                <Link className="btn primary" href="/compounding-expertise/overview">Start</Link>
              </div>
            </div>
          </>
        )}
      </details>
      {children}
    </DemoAppShell>
  );
}
