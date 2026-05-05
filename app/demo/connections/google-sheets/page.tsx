import { Metadata } from "next";
import Link from "next/link";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { GoogleSheetsConnectionFlow } from "@/components/demo/GoogleSheetsConnectionFlow";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";
import { TOOL_IMPORT_SCHEMAS } from "@/lib/tool-data-imports";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Google Sheets Connector | David Wolfe",
  description: "Google Sheets preview flow for Tools datasets.",
  path: "/workspace/connections/google-sheets"
});

type PageProps = {
  searchParams: Promise<{ tool?: string; config?: string }>;
};

export default async function WorkspaceGoogleSheetsConnectionPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace connector" title="Google Sheets">
        <p>
          Connect a Google Sheet, assign tabs or ranges to tool data objects, and preview headers before routing the source
          into the shared mapping and import framework.
        </p>
        <div className="ctaRow">
          <Link className="btn" href="/workspace/connections">Back to connections</Link>
          <Link className="btn" href="/workspace/connections/csv">Open CSV mapping</Link>
        </div>
      </Section>

      <Section title="Supported tool schemas">
        <div className="grid grid-3">
          {TOOL_IMPORT_SCHEMAS.map((schema) => (
            <div className="card" key={schema.tool}>
              <p className="editorKicker">{schema.label}</p>
              <h3>{schema.objects.length} sheet ranges</h3>
              <p className="small">{schema.objects.map((object) => object.title).join(" · ")}</p>
              <Link className="btn smallBtn" href={`/workspace/connections/google-sheets?tool=${schema.tool}`}>
                Preview {schema.label}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Sheet preview">
        <GoogleSheetsConnectionFlow initialTool={params.tool} initialConfigId={params.config} />
      </Section>
    </>
  );
}
