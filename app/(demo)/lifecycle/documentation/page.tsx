import { Section } from "@/components/site/Section";
import { VariableDefinitions } from "@/components/demo/VariableDefinitions";
import { ModelDocs } from "@/components/demo/ModelDocs";

export default function DemoDocumentationPage() {
  return (
    <>
      <Section title="Documentation: variables and model context">
        <p>
          This tab centralizes variable definitions and modeling language so inputs, scoring, and outputs remain
          transparent as you run lifecycle simulations.
        </p>
      </Section>
      <Section title="Data dictionary">
        <VariableDefinitions />
      </Section>
      <ModelDocs app="lifecycle" />
    </>
  );
}
