import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";
import { getToolImportSchema, TOOL_IMPORT_SCHEMAS, type ToolKey } from "@/lib/tool-data-imports";

export const runtime = "nodejs";

type PreviewRequest = {
  tool?: unknown;
  sheetUrlOrId?: unknown;
  ranges?: unknown;
};

type GoogleAuthMode =
  | { kind: "api_key"; apiKey: string }
  | { kind: "service_account"; accessToken: string; clientEmail: string };

type ServiceAccountCredentials = {
  client_email?: unknown;
  private_key?: unknown;
  token_uri?: unknown;
};

type GoogleTokenResponse = {
  access_token?: unknown;
  error?: unknown;
  error_description?: unknown;
};

type SheetsValuesResponse = {
  values?: unknown[][];
  error?: {
    message?: string;
  };
};

const validTools = new Set(TOOL_IMPORT_SCHEMAS.map((schema) => schema.tool));

function isToolKey(value: unknown): value is ToolKey {
  return typeof value === "string" && validTools.has(value as ToolKey);
}

function extractSheetId(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return "";
}

function rowsFromValues(values: unknown[][] | undefined) {
  const [headerRow = [], ...dataRows] = values ?? [];
  const headers = headerRow.map((cell) => String(cell ?? "").trim()).filter(Boolean);
  const rows = dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "")])));
  return { headers, rows };
}

function base64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function normalizePrivateKey(value: string) {
  return value.includes("\\n") ? value.replaceAll("\\n", "\n") : value;
}

async function readServiceAccountCredentials() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) return JSON.parse(json) as ServiceAccountCredentials;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) return null;
  const contents = await readFile(credentialsPath, "utf8");
  return JSON.parse(contents) as ServiceAccountCredentials;
}

function signServiceAccountJwt(credentials: { clientEmail: string; privateKey: string; tokenUri: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: credentials.clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: credentials.tokenUri,
    exp: now + 3600,
    iat: now
  }));
  const unsignedJwt = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(normalizePrivateKey(credentials.privateKey), "base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

  return `${unsignedJwt}.${signature}`;
}

async function getServiceAccountAuth(): Promise<GoogleAuthMode | null> {
  const credentials = await readServiceAccountCredentials();
  if (!credentials) return null;

  const clientEmail = typeof credentials.client_email === "string" ? credentials.client_email : "";
  const privateKey = typeof credentials.private_key === "string" ? credentials.private_key : "";
  const tokenUri = typeof credentials.token_uri === "string" ? credentials.token_uri : "https://oauth2.googleapis.com/token";
  if (!clientEmail || !privateKey) {
    throw new Error("Google service account credentials require client_email and private_key.");
  }

  const assertion = signServiceAccountJwt({ clientEmail, privateKey, tokenUri });
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const payload = await response.json().catch(() => ({})) as GoogleTokenResponse;
  if (!response.ok || typeof payload.access_token !== "string") {
    const message = typeof payload.error_description === "string"
      ? payload.error_description
      : typeof payload.error === "string"
        ? payload.error
        : "Google service account token exchange failed.";
    throw new Error(message);
  }

  return { kind: "service_account", accessToken: payload.access_token, clientEmail };
}

async function resolveGoogleAuth(): Promise<GoogleAuthMode | null> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey) return { kind: "api_key", apiKey };
  return getServiceAccountAuth();
}

async function fetchSheetRange(sheetId: string, range: string, auth: GoogleAuthMode) {
  const url = auth.kind === "api_key"
    ? `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${auth.apiKey}`
    : `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: auth.kind === "service_account" ? { Authorization: `Bearer ${auth.accessToken}` } : undefined
  });
  const payload = await response.json().catch(() => ({})) as SheetsValuesResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Google Sheets returned ${response.status}.`);
  }
  return rowsFromValues(payload.values);
}

export async function POST(request: Request) {
  const eventId = createEventId("sheets_preview");

  try {
    const body = await request.json().catch(() => ({})) as PreviewRequest;
    if (!isToolKey(body.tool)) {
      return apiError(400, "VALIDATION_ERROR", "A valid target tool is required.", { eventId });
    }

    if (typeof body.sheetUrlOrId !== "string") {
      return apiError(400, "VALIDATION_ERROR", "A Google Sheet URL or ID is required.", { eventId });
    }

    const sheetId = extractSheetId(body.sheetUrlOrId);
    if (!sheetId) {
      return apiError(400, "VALIDATION_ERROR", "Enter a valid Google Sheet URL or spreadsheet ID.", { eventId });
    }

    const auth = await resolveGoogleAuth();
    if (!auth) {
      return apiError(501, "GOOGLE_SHEETS_NOT_CONFIGURED", "Google Sheets preview requires an API key or service account.", {
        eventId,
        configured: false,
        required: ["GOOGLE_SHEETS_API_KEY", "or", "GOOGLE_APPLICATION_CREDENTIALS", "or", "GOOGLE_SERVICE_ACCOUNT_JSON"]
      });
    }

    const schema = getToolImportSchema(body.tool);
    const submittedRanges = body.ranges && typeof body.ranges === "object" ? body.ranges as Record<string, unknown> : {};
    const objects: Record<string, { range: string; headers: string[]; rows: Record<string, string>[]; rowCount: number }> = {};

    for (const object of schema.objects) {
      const submittedRange = submittedRanges[object.key];
      const range = typeof submittedRange === "string" && submittedRange.trim() ? submittedRange.trim() : `${object.title}!A:Z`;
      const preview = await fetchSheetRange(sheetId, range, auth);
      objects[object.key] = {
        range,
        headers: preview.headers,
        rows: preview.rows.slice(0, object.maxRows),
        rowCount: preview.rows.length
      };
    }

    return apiOk({ eventId, configured: true, authMode: auth.kind, sheetId, tool: body.tool, objects });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
