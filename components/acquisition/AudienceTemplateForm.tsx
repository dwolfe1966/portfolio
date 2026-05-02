"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

export type AudienceTemplateFormInitial = {
  id?: string;
  name: string;
  audienceType: string;
  description: string;
  predictedCpcCents: number;
  predictedCacCents: number;
  targetingJsonString: string;
};

const BLANK: AudienceTemplateFormInitial = {
  name: "",
  audienceType: "lookalike",
  description: "",
  predictedCpcCents: 300,
  predictedCacCents: 14500,
  targetingJsonString: '{\n  "seniority": ["director", "vp"],\n  "intent": "high"\n}'
};

export function AudienceTemplateForm({
  initial = BLANK,
  mode
}: {
  initial?: AudienceTemplateFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof AudienceTemplateFormInitial>(
    key: K,
    value: AudienceTemplateFormInitial[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setErrors([]);

    const payload = {
      name: form.name,
      audienceType: form.audienceType,
      description: form.description,
      predictedCpcCents: form.predictedCpcCents,
      predictedCacCents: form.predictedCacCents,
      targetingJson: form.targetingJsonString
    };

    try {
      const url =
        mode === "create"
          ? "/api/acquisition/audiences"
          : `/api/acquisition/audiences/${initial.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!result.ok) {
        const errorList = (result.error?.details?.errors as string[] | undefined) ?? [];
        setErrors(errorList);
        setStatus(readErrorMessage(result, "Could not save audience template."));
        return;
      }

      setStatus(mode === "create" ? "Audience template created." : "Audience template saved.");
      if (mode === "create" && result.template?.id) {
        router.push(`/acquisition/audiences/${result.template.id}`);
        return;
      }
      router.refresh();
    } catch {
      setStatus("Network error while saving audience template.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate() {
    if (!initial.id) return;
    if (!confirm("Delete this audience template? Campaigns currently using it will block deletion.")) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/acquisition/audiences/${initial.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!result.ok) {
        setStatus(readErrorMessage(result, "Could not delete audience template."));
        return;
      }
      router.push("/acquisition/audiences");
    } catch {
      setStatus("Network error while deleting audience template.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <label>
          Name
          <input
            type="text"
            value={form.name}
            maxLength={80}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. ICP Operators (lookalike)"
          />
        </label>
        <label>
          Audience type
          <select value={form.audienceType} onChange={(e) => update("audienceType", e.target.value)}>
            <option value="lookalike">lookalike</option>
            <option value="interest">interest</option>
            <option value="keyword">keyword</option>
            <option value="retargeting">retargeting</option>
            <option value="custom">custom</option>
          </select>
        </label>
        <label>
          Predicted CPC (cents)
          <input
            type="number"
            min={0}
            max={50000}
            value={form.predictedCpcCents}
            onChange={(e) => update("predictedCpcCents", Number(e.target.value || 0))}
          />
        </label>
        <label>
          Predicted CAC (cents)
          <input
            type="number"
            min={0}
            max={500000}
            value={form.predictedCacCents}
            onChange={(e) => update("predictedCacCents", Number(e.target.value || 0))}
          />
        </label>
      </div>
      <label style={{ display: "block", marginTop: 12 }}>
        Description (optional)
        <input
          type="text"
          maxLength={500}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="When to use this audience"
        />
      </label>
      <label style={{ display: "block", marginTop: 12 }}>
        Targeting JSON
        <textarea
          rows={8}
          value={form.targetingJsonString}
          onChange={(e) => update("targetingJsonString", e.target.value)}
          style={{ fontFamily: "var(--demo-mono, monospace)", fontSize: 12, width: "100%" }}
        />
      </label>

      {errors.length > 0 ? (
        <ul style={{ marginTop: 8 }}>
          {errors.map((err) => (
            <li key={err} className="bandText--unhealthy small">{err}</li>
          ))}
        </ul>
      ) : null}

      <div className="ctaRow">
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Create audience" : "Save changes"}
        </button>
        {mode === "edit" ? (
          <button type="button" onClick={deleteTemplate} disabled={loading}>
            Delete
          </button>
        ) : null}
      </div>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </form>
  );
}
