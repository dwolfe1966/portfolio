"use client";

import { useMemo, useState } from "react";

type CsvObjectKey = "users" | "entities" | "interestEdges" | "changeEvents";

type CsvConfig = {
  key: CsvObjectKey;
  title: string;
  description: string;
  requiredFields: string[];
  sample: string;
};

type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
};

const configs: CsvConfig[] = [
  {
    key: "users",
    title: "Users",
    description: "People eligible for lifecycle scoring and generated outreach.",
    requiredFields: ["fullName", "email", "segment", "subscriptionStatus"],
    sample: "fullName,email,segment,subscriptionStatus,lastActiveAt\nJordan Lee,jordan@example.com,TRIAL,TRIALING,2026-04-28\nMorgan Patel,morgan@example.com,LAPSED,EXPIRED,2026-04-15"
  },
  {
    key: "entities",
    title: "Entities",
    description: "Records, people, companies, properties, or objects a user is tracking.",
    requiredFields: ["name", "entityType"],
    sample: "name,entityType,city,state\n123 Main St,property,Austin,TX\nAcme Holdings,business,Denver,CO"
  },
  {
    key: "interestEdges",
    title: "Interest edges",
    description: "Relationships connecting users to tracked entities with signal strength.",
    requiredFields: ["userEmail", "entityName", "interestScore", "source"],
    sample: "userEmail,entityName,interestScore,source\njordan@example.com,123 Main St,0.82,saved_search\nmorgan@example.com,Acme Holdings,0.64,profile_view"
  },
  {
    key: "changeEvents",
    title: "Change events",
    description: "Detected deltas that create lifecycle campaign opportunities.",
    requiredFields: ["entityName", "changeType", "deltaSummary", "detectedAt"],
    sample: "entityName,changeType,oldValue,newValue,deltaSummary,detectedAt\n123 Main St,ADDRESS_CHANGE,Old address,New address,A new address update was detected.,2026-05-01\nAcme Holdings,EMAIL_ADDED,,ops@example.com,A new email was added.,2026-05-02"
  }
];

const segments = new Set(["FREE", "TRIAL", "LAPSED", "ACTIVE"]);
const statuses = new Set(["NONE", "TRIALING", "ACTIVE", "CANCELED", "EXPIRED"]);
const changeTypes = new Set(["ADDRESS_CHANGE", "PHONE_ADDED", "PHONE_CHANGED", "EMAIL_ADDED", "ASSOCIATE_ADDED", "LEGAL_RECORD_ADDED"]);

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      value += "\"";
      index++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  cells.push(value.trim());
  return cells;
}

function parseCsv(text: string, config: CsvConfig): ParsedCsv {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [], errors: ["Paste CSV text or load the sample data."] };

  const headers = parseCsvLine(lines[0]);
  const errors: string[] = [];
  const missing = config.requiredFields.filter((field) => !headers.includes(field));
  if (missing.length > 0) errors.push(`Missing required fields: ${missing.join(", ")}`);

  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  rows.slice(0, 100).forEach((row, index) => {
    const rowNumber = index + 2;
    if (config.key === "users") {
      if (row.segment && !segments.has(row.segment)) errors.push(`Row ${rowNumber}: segment must be FREE, TRIAL, LAPSED, or ACTIVE.`);
      if (row.subscriptionStatus && !statuses.has(row.subscriptionStatus)) errors.push(`Row ${rowNumber}: subscriptionStatus is not recognized.`);
      if (row.email && !row.email.includes("@")) errors.push(`Row ${rowNumber}: email does not look valid.`);
    }
    if (config.key === "interestEdges") {
      const score = Number(row.interestScore);
      if (!Number.isFinite(score) || score < 0 || score > 1) errors.push(`Row ${rowNumber}: interestScore must be between 0 and 1.`);
    }
    if (config.key === "changeEvents" && row.changeType && !changeTypes.has(row.changeType)) {
      errors.push(`Row ${rowNumber}: changeType is not recognized.`);
    }
  });

  if (rows.length === 0) errors.push("CSV has headers but no data rows.");

  return { headers, rows, errors: [...new Set(errors)] };
}

export function LifecycleCsvUploadScaffold() {
  const [csvByObject, setCsvByObject] = useState<Record<CsvObjectKey, string>>({
    users: "",
    entities: "",
    interestEdges: "",
    changeEvents: ""
  });

  const parsedByObject = useMemo(
    () => Object.fromEntries(configs.map((config) => [config.key, parseCsv(csvByObject[config.key], config)])) as Record<CsvObjectKey, ParsedCsv>,
    [csvByObject]
  );

  const totalRows = configs.reduce((sum, config) => sum + parsedByObject[config.key].rows.length, 0);
  const totalErrors = configs.reduce((sum, config) => sum + parsedByObject[config.key].errors.length, 0);
  const importReady = totalRows > 0 && totalErrors === 0 && configs.every((config) => parsedByObject[config.key].rows.length > 0);

  function updateCsv(key: CsvObjectKey, value: string) {
    setCsvByObject((current) => ({ ...current, [key]: value }));
  }

  async function loadFile(key: CsvObjectKey, file: File | null) {
    if (!file) return;
    updateCsv(key, await file.text());
  }

  return (
    <div className="lifecycleCsvScaffold">
      <div className="card">
        <div className="editorHeader">
          <div>
            <p className="editorKicker">CSV upload scaffold</p>
            <h3>Validate lifecycle data before import</h3>
          </div>
          <p className={`statusPill ${importReady ? "live" : "progress"}`}>{importReady ? "Ready to import" : "Validation draft"}</p>
        </div>
        <p>
          Paste CSV text or load sample rows for each lifecycle object. This validates and previews data locally;
          database import will be the next backend step.
        </p>
        <p className="small">Rows parsed: {totalRows} · validation issues: {totalErrors}</p>
        <button type="button" disabled={!importReady}>Import dataset (coming next)</button>
      </div>

      <div className="grid grid-2">
        {configs.map((config) => {
          const parsed = parsedByObject[config.key];
          return (
            <div className="card editorCard" key={config.key}>
              <div className="editorHeader">
                <div>
                  <p className="editorKicker">{config.title}</p>
                  <h3>{parsed.rows.length} rows parsed</h3>
                </div>
                <button type="button" onClick={() => updateCsv(config.key, config.sample)}>Load sample</button>
              </div>
              <p>{config.description}</p>
              <p className="small">Required: <code>{config.requiredFields.join(", ")}</code></p>
              <label>
                CSV data
                <textarea
                  rows={7}
                  value={csvByObject[config.key]}
                  onChange={(event) => updateCsv(config.key, event.target.value)}
                  placeholder={config.sample}
                />
              </label>
              <label>
                Upload CSV file
                <input type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(config.key, event.target.files?.[0] ?? null)} />
              </label>

              {parsed.errors.length > 0 ? (
                <div>
                  <p className="small bandText--unhealthy">Validation issues</p>
                  <ul>
                    {parsed.errors.slice(0, 5).map((error) => <li className="small bandText--unhealthy" key={error}>{error}</li>)}
                  </ul>
                </div>
              ) : parsed.rows.length > 0 ? (
                <p className="small bandText--healthy">Headers and preview rows look valid.</p>
              ) : null}

              {parsed.rows.length > 0 ? (
                <div className="tableScroll">
                  <table className="table">
                    <thead>
                      <tr>{parsed.headers.slice(0, 5).map((header) => <th key={header}>{header}</th>)}</tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 3).map((row, rowIndex) => (
                        <tr key={`${config.key}-${rowIndex}`}>
                          {parsed.headers.slice(0, 5).map((header) => <td key={header}>{row[header]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
