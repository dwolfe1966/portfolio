import { readFile } from "node:fs/promises";
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
  searchParams: Promise<{ tool?: string; config?: string; action?: string }>;
};

type CredentialStatus = {
  configured: boolean;
  mode: "api_key" | "service_account_file" | "service_account_json" | "none";
  serviceAccountEmail: string;
  message: string;
};

async function loadCredentialStatus(): Promise<CredentialStatus> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) as { client_email?: unknown };
      const serviceAccountEmail = typeof credentials.client_email === "string" ? credentials.client_email : "";
      return {
        configured: Boolean(serviceAccountEmail),
        mode: "service_account_json",
        serviceAccountEmail,
        message: serviceAccountEmail
          ? "Inline service account JSON is configured for private Sheets."
          : "GOOGLE_SERVICE_ACCOUNT_JSON is set, but client_email was not found."
      };
    } catch {
      return {
        configured: false,
        mode: "service_account_json",
        serviceAccountEmail: "",
        message: "GOOGLE_SERVICE_ACCOUNT_JSON is set, but it is not valid JSON."
      };
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    try {
      const credentials = JSON.parse(await readFile(credentialsPath, "utf8")) as { client_email?: unknown };
      const serviceAccountEmail = typeof credentials.client_email === "string" ? credentials.client_email : "";
      return {
        configured: Boolean(serviceAccountEmail),
        mode: "service_account_file",
        serviceAccountEmail,
        message: serviceAccountEmail
          ? "Service account credential file is configured for private Sheets."
          : "GOOGLE_APPLICATION_CREDENTIALS is set, but client_email was not found."
      };
    } catch {
      return {
        configured: false,
        mode: "service_account_file",
        serviceAccountEmail: "",
        message: "GOOGLE_APPLICATION_CREDENTIALS is set, but the file could not be read as JSON."
      };
    }
  }

  if (process.env.GOOGLE_SHEETS_API_KEY) {
    return {
      configured: true,
      mode: "api_key",
      serviceAccountEmail: "",
      message: "Google Sheets API key is configured for public or link-accessible Sheets."
    };
  }

  return {
    configured: false,
    mode: "none",
    serviceAccountEmail: "",
    message: "No Google Sheets credential is configured yet."
  };
}

export default async function WorkspaceGoogleSheetsConnectionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const credentialStatus = await loadCredentialStatus();

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace connector" title="Google Sheets">
        <p>
          Connect a Google Sheet, assign tabs or ranges to tool data objects, and preview headers before routing the source
          into the shared mapping and import framework.
        </p>
      </Section>

      <Section title="Sheet preview">
        <GoogleSheetsConnectionFlow initialTool={params.tool} initialConfigId={params.config} initialAction={params.action} />
      </Section>

      <Section title="Credential setup">
        <div className="grid grid-2">
          <div className="card">
            <div className="editorHeader">
              <div>
                <p className="editorKicker">Runtime status</p>
                <h3>{credentialStatus.configured ? "Configured" : "Needs setup"}</h3>
              </div>
              <p className={`statusPill ${credentialStatus.configured ? "live" : "progress"}`}>{credentialStatus.mode}</p>
            </div>
            <p>{credentialStatus.message}</p>
            {credentialStatus.serviceAccountEmail ? (
              <p className="small">
                Share private Sheets with <code>{credentialStatus.serviceAccountEmail}</code>.
              </p>
            ) : null}
          </div>
          <div className="card">
          <p>
            Public Sheets can use <code>GOOGLE_SHEETS_API_KEY</code>. Private Sheets should use a Google service account with
            <code> GOOGLE_APPLICATION_CREDENTIALS</code> pointing at the JSON credential file, then share the Sheet with the
            service account email.
          </p>
          </div>
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
    </>
  );
}
