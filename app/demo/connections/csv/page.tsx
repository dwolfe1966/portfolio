import { Metadata } from "next";
import Link from "next/link";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { WorkspaceCsvConnectionFlow } from "@/components/demo/WorkspaceCsvConnectionFlow";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";
import { TOOL_IMPORT_SCHEMAS } from "@/lib/tool-data-imports";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "CSV Connector | David Wolfe",
  description: "Shared CSV mapping and validation flow for Tools datasets.",
  path: "/workspace/connections/csv"
});

type PageProps = {
  searchParams: Promise<{ tool?: string; config?: string; action?: string }>;
};

export default async function WorkspaceCsvConnectionPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace connector" title="CSV and spreadsheet upload">
        <p>
          Upload or paste CSV data, choose the target tool, map source columns to model objects, and validate rows before
          importing. Imported snapshots are attached to the signed-in account and become available inside each product app.
        </p>
      </Section>

      <Section title="CSV mapping">
        <WorkspaceCsvConnectionFlow initialTool={params.tool} initialConfigId={params.config} initialAction={params.action} />
      </Section>

      <Section title="Supported tool schemas">
        <div className="grid grid-3">
          {TOOL_IMPORT_SCHEMAS.map((schema) => (
            <div className="card" key={schema.tool}>
              <p className="editorKicker">{schema.label}</p>
              <h3>{schema.objects.length} data objects</h3>
              <p className="small">{schema.objects.map((object) => object.title).join(" · ")}</p>
              <Link className="btn smallBtn" href={`/workspace/connections/csv?tool=${schema.tool}`}>Map {schema.label}</Link>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
