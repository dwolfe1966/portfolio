"use client";

import { useRef } from "react";
import type { CompoundingExampleId } from "@/lib/compounding-expertise-lab";

type ExampleRow = {
  id: CompoundingExampleId;
  label: string;
  testLabel: string;
  canonicalQuestion: string;
  principalDecision: string;
  gradeObjectivity: string;
  typicalFeedbackSpeed: string;
  economicCostOfError: string;
  primaryPowerHypothesis: string;
  whyCanonical: string;
  status: string;
  syntheticDatasetLabel: string;
  caseCount: number;
};

export function ExampleSelectionTable({
  examples,
  loadAction
}: {
  examples: ExampleRow[];
  loadAction: (formData: FormData) => void | Promise<void>;
}) {
  const forms = useRef<Record<string, HTMLFormElement | null>>({});

  function openExample(id: string) {
    forms.current[id]?.requestSubmit();
  }

  return (
    <div className="tableScroll compoundingExampleTable">
      <table className="dataTable">
        <thead>
          <tr>
            <th>Open</th>
            <th>Test type</th>
            <th>Company / archetype</th>
            <th>Canonical question</th>
            <th>Principal decision</th>
            <th>Grade objectivity</th>
            <th>Feedback speed</th>
            <th>Economic stakes</th>
            <th>Primary Power hypothesis</th>
            <th>Why this test exists</th>
            <th>Cases</th>
            <th>Case-set label</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((example) => (
            <tr
              key={example.id}
              tabIndex={0}
              onDoubleClick={() => openExample(example.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") openExample(example.id);
              }}
              title="Double-click to open this example"
            >
              <td>
                <form
                  action={loadAction}
                  ref={(element) => {
                    forms.current[example.id] = element;
                  }}
                >
                  <input type="hidden" name="exampleId" value={example.id} />
                  <button className="btn" type="submit">Open</button>
                </form>
              </td>
              <td><strong>{example.testLabel}</strong></td>
              <td><strong>{example.label}</strong></td>
              <td>{example.canonicalQuestion}</td>
              <td>{example.principalDecision}</td>
              <td>{example.gradeObjectivity}</td>
              <td>{example.typicalFeedbackSpeed}</td>
              <td>{example.economicCostOfError}</td>
              <td>{example.primaryPowerHypothesis}</td>
              <td>{example.whyCanonical}</td>
              <td>{example.caseCount}</td>
              <td>
                <span>{example.syntheticDatasetLabel}</span>
                <br />
                <span className="small">{example.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
