import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";
import { VariableDefinitions } from "@/components/demo/VariableDefinitions";

export default function DemoDocumentationPage() {
  return (
    <>
      <DemoWorkspaceNav />
      <Section title="Documentation: variables and model context">
        <p>
          This tab centralizes variable definitions and modeling language so inputs, scoring, and outputs remain
          transparent as you run lifecycle simulations.
        </p>
      </Section>
      <Section title="Data dictionary">
        <VariableDefinitions />
      </Section>
    </>
  );
}
