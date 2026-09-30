import Link from "next/link";
import { ExperienceTransferResults } from "./ExperienceTransferResults";
import type { DebateEvidenceItem, DerivedDebateCandidate } from "@/lib/compounding-expertise-lab";
import { DEBATE_ARGUMENT_STRUCTURE } from "@/lib/debate-argument-structure";

function evidenceExcerpt(label: string, items: DebateEvidenceItem[], empty: string) {
  const item = items.find((entry) => entry.provenance.includes("SOURCED")) ?? items[0];
  return <div className="compoundingBriefEvidence">
    <h5>{label} <span className="miniTag">{items.length}</span></h5>
    {item ? <>
      <p>{item.value}</p>
      <p className="small"><strong>Meaning:</strong> {item.interpretation}</p>
      <p className="small"><strong>Limit:</strong> {item.limitation}</p>
      <p className="small">{item.href ? <Link href={item.href}>{item.source}</Link> : item.source}</p>
      {items.length > 1 ? <p className="small">{items.length - 1} more in the full evidence ledger below.</p> : null}
    </> : <p className="small">{empty}</p>}
  </div>;
}

export function DebateArgumentBrief({ candidate }: { candidate: DerivedDebateCandidate }) {
  const structure = DEBATE_ARGUMENT_STRUCTURE[candidate.family];
  return <div className="compoundingArgumentBrief">
    <div className="compoundingBriefTakeaway">
      <p className="small">Finding · {candidate.assessment} · {candidate.confidence} confidence</p>
      <p><strong>{candidate.assessmentReason}</strong></p>
      <p className="small"><strong>Assessment scope:</strong> {structure.thesis}</p>
      <p className="small"><strong>Why it matters:</strong> {candidate.whyLoadBearing}</p>
    </div>
    {candidate.transferExperiment ? <ExperienceTransferResults result={candidate.transferExperiment} /> : null}
    <div className="compoundingBriefClaims">
      <h4>Thesis being tested</h4>
      <p>{structure.thesis}</p>
      <h5>Subclaims: what must be true</h5>
      <ol>{structure.subclaims.map((claim) => <li key={claim}>{claim}</li>)}</ol>
    </div>
    <div className="compoundingBriefEvidenceGrid">
      <div>
        <h4>What evidence exists?</h4>
        {evidenceExcerpt("Supports the thesis", candidate.evidenceFor, "No supporting evidence is attached to this proposition.")}
        {evidenceExcerpt("Challenges the thesis", candidate.evidenceAgainst, "No contradicting evidence is attached.")}
        {evidenceExcerpt("What the cases show", candidate.contextEvidence, "No contextual evidence is attached.")}
      </div>
      <div>
        <h4>What is still lacking?</h4>
        {candidate.missingEvidence.length ? <ol className="compoundingBriefGaps">
          {candidate.missingEvidence.slice(0, 2).map((item) => <li key={`${item.source}-${item.value}`}>
            <strong>{item.expectedEvidence || item.value}</strong>
            <p className="small">{item.interpretation}</p>
          </li>)}
        </ol> : <p className="small">No explicit gaps are recorded. This does not establish that every subclaim has been tested.</p>}
        {candidate.missingEvidence.length > 2 ? <p className="small">{candidate.missingEvidence.length - 2} more gaps in the full evidence ledger.</p> : null}
        <div className="compoundingBriefNextTest">
          <h5>Next decisive test</h5>
          <p>{candidate.bestNextTest}</p>
          <p className="small"><strong>Decision value:</strong> {candidate.highestValueDiligence}</p>
        </div>
      </div>
    </div>
  </div>;
}
