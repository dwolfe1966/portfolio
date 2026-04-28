// A simple wrapper component that displays the acquisition system flowchart.
// Place the final acquisition diagram image in your Next.js public/images folder
// and update the src path accordingly. The diagram should illustrate how
// campaigns flow through creative generation, audience selection, test cells,
// agent orchestrator, ad platforms, and performance analytics.

export function AcquisitionFlowDiagram() {
  return (
    <div className="flex justify-center">
      <img
        src="/images/acquisition_flow.png"
        alt="Acquisition system architecture diagram"
        className="max-w-full h-auto"
      />
    </div>
  );
}