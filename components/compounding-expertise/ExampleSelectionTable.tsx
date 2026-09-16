"use client";

import { useRef } from "react";
import type { CompoundingExampleId } from "@/lib/compounding-expertise-lab";

type ExampleRow = {
  id: CompoundingExampleId;
  label: string;
  role: string;
  context: string;
  thesis: string;
  syntheticDatasetLabel: string;
  caseCount: number;
  fixtureType: string;
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
            <th>Company / archetype</th>
            <th>Context</th>
            <th>Theory test</th>
            <th>Cases</th>
            <th>Fixture type</th>
            <th>Scorebook status</th>
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
              <td><strong>{example.label}</strong></td>
              <td>{example.context}</td>
              <td>{example.role}</td>
              <td>{example.caseCount}</td>
              <td>{example.fixtureType}</td>
              <td>
                <span>{example.syntheticDatasetLabel}</span>
                <br />
                <span className="small">{example.thesis}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
