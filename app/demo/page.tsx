import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";

export default function DemoPage() {
  return (
    <>
      <DemoWorkspaceNav />
      <Section eyebrow="Demo" title="Lifecycle Engine Workspace">
        <p>
          This workspace is organized into four stages: Overview, Inputs, Simulations, and Outputs.
          Use the navigation above to walk the pipeline end-to-end.
        </p>
      </Section>
    </>
  );
}
