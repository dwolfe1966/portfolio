import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";
import { getToolImportSchema, TOOL_IMPORT_SCHEMAS, type ToolKey } from "@/lib/tool-data-imports";

type PreviewRequest = {
  tool?: unknown;
  sheetUrlOrId?: unknown;
  ranges?: unknown;
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

async function fetchSheetRange(sheetId: string, range: string, apiKey: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
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

    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
      return apiError(501, "GOOGLE_SHEETS_NOT_CONFIGURED", "Google Sheets preview requires GOOGLE_SHEETS_API_KEY.", {
        eventId,
        configured: false,
        required: ["GOOGLE_SHEETS_API_KEY"]
      });
    }

    const schema = getToolImportSchema(body.tool);
    const submittedRanges = body.ranges && typeof body.ranges === "object" ? body.ranges as Record<string, unknown> : {};
    const objects: Record<string, { range: string; headers: string[]; rows: Record<string, string>[]; rowCount: number }> = {};

    for (const object of schema.objects) {
      const submittedRange = submittedRanges[object.key];
      const range = typeof submittedRange === "string" && submittedRange.trim() ? submittedRange.trim() : `${object.title}!A:Z`;
      const preview = await fetchSheetRange(sheetId, range, apiKey);
      objects[object.key] = {
        range,
        headers: preview.headers,
        rows: preview.rows.slice(0, 25),
        rowCount: preview.rows.length
      };
    }

    return apiOk({ eventId, configured: true, sheetId, tool: body.tool, objects });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
