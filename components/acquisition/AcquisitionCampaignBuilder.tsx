"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { acquisitionProviderLabel, acquisitionProviderTargetingFacts } from "@/lib/acquisition-source-lineage";

type Channel = "SEARCH" | "SOCIAL" | "DISPLAY" | "VIDEO";
type AudienceSource = "defaults" | "templates";
type TemplateOption = {
  id: string;
  name: string;
  audienceType: string;
  predictedCpcCents: number;
  predictedCacCents: number;
  targetingJson: unknown;
};
type CreatedCampaign = {
  id: string;
  name: string;
};

const DEFAULT_CHANNELS: Channel[] = ["SEARCH", "SOCIAL"];

export function AcquisitionCampaignBuilder() {
  const [name, setName] = useState("May paid growth sprint");
  const [objective, setObjective] = useState("Increase qualified demo requests");
  const [budgetDollars, setBudgetDollars] = useState(2500);
  const [targetCacDollars, setTargetCacDollars] = useState(145);
  const [targetLtvDollars, setTargetLtvDollars] = useState(720);
  const [maxBudgetShiftPct, setMaxBudgetShiftPct] = useState(0.2);
  const [minConfidence, setMinConfidence] = useState(0.65);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [audienceSource, setAudienceSource] = useState<AudienceSource>("defaults");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [createdCampaign, setCreatedCampaign] = useState<CreatedCampaign | null>(null);

  const startAt = useMemo(() => new Date().toISOString(), []);
  const endAt = useMemo(() => new Date(Date.now() + 14 * 86400000).toISOString(), []);

  useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      try {
        const response = await fetch("/api/acquisition/audiences", { cache: "no-store" });
        const json = await response.json();
        if (cancelled) return;
        if (json.ok && Array.isArray(json.templates)) {
          setTemplates(
            json.templates.map((t: TemplateOption) => ({
              id: t.id,
              name: t.name,
              audienceType: t.audienceType,
              predictedCpcCents: t.predictedCpcCents,
              predictedCacCents: t.predictedCacCents,
              targetingJson: t.targetingJson
            }))
          );
        }
      } catch {
        // leave templates empty; UI falls back to defaults-only.
      }
    }
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleChannel(channel: Channel) {
    setChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  }

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setCreatedCampaign(null);

    const templateIds =
      audienceSource === "templates" && selectedTemplateIds.length > 0
        ? selectedTemplateIds
        : undefined;

    try {
      const response = await fetch("/api/acquisition/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          objective,
          budgetCents: Math.round(budgetDollars * 100),
          startAt,
          endAt,
          channels,
          targetCacCents: Math.round(targetCacDollars * 100),
          targetLtvCents: Math.round(targetLtvDollars * 100),
          maxBudgetShiftPct,
          minConfidence,
          cooldownHours,
          templateIds
        })
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        const message = Array.isArray(json.errors) ? json.errors.join(", ") : json.error ?? "Unable to create campaign";
        setStatus(`Error: ${message}`);
        return;
      }

      setCreatedCampaign({ id: json.campaign.id, name: json.campaign.name });
      setStatus("Campaign created. Review the campaign setup or run the next simulation iteration.");
    } catch {
      setStatus("Error: network issue while creating campaign.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h3>Create acquisition campaign</h3>
      <p>Bootstrap the paid-acquisition loop directly in-app (no CLI required).</p>

      <label>
        Campaign name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Objective
        <input value={objective} onChange={(event) => setObjective(event.target.value)} />
      </label>

      <div className="grid grid-2">
        <label>
          Budget ($)
          <input type="number" min={50} step={1} value={budgetDollars} onChange={(event) => setBudgetDollars(Number(event.target.value))} />
        </label>
        <label>
          Target CAC ($)
          <input type="number" min={10} step={1} value={targetCacDollars} onChange={(event) => setTargetCacDollars(Number(event.target.value))} />
        </label>
        <label>
          Target LTV ($)
          <input type="number" min={10} step={1} value={targetLtvDollars} onChange={(event) => setTargetLtvDollars(Number(event.target.value))} />
        </label>
        <label>
          Max budget shift %
          <input type="number" min={0.01} max={0.5} step={0.01} value={maxBudgetShiftPct} onChange={(event) => setMaxBudgetShiftPct(Number(event.target.value))} />
        </label>
      </div>

      <label>
        Minimum confidence threshold
        <input type="number" min={0.5} max={0.95} step={0.01} value={minConfidence} onChange={(event) => setMinConfidence(Number(event.target.value))} />
      </label>
      <label>
        Reallocation cooldown (hours)
        <input type="number" min={1} max={168} step={1} value={cooldownHours} onChange={(event) => setCooldownHours(Number(event.target.value))} />
      </label>

      <fieldset style={{ border: 0, padding: 0, marginTop: 8 }}>
        <legend className="small" style={{ marginBottom: 6 }}>Channels</legend>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["SEARCH", "SOCIAL", "DISPLAY", "VIDEO"] as Channel[]).map((channel) => (
            <button
              key={channel}
              type="button"
              className={channels.includes(channel) ? "btn primary" : "btn"}
              onClick={() => toggleChannel(channel)}
            >
              {channel}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 0, padding: 0, marginTop: 12 }}>
        <legend className="small" style={{ marginBottom: 6 }}>Audience source</legend>
        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="audienceSource"
              value="defaults"
              checked={audienceSource === "defaults"}
              onChange={() => setAudienceSource("defaults")}
            />
            <span>Built-in defaults (3 audiences)</span>
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="audienceSource"
              value="templates"
              checked={audienceSource === "templates"}
              onChange={() => setAudienceSource("templates")}
              disabled={templates.length === 0}
            />
            <span>
              Pick from library
              {templates.length === 0 ? " (none yet)" : ` (${templates.length} available)`}
            </span>
          </label>
        </div>
        {audienceSource === "templates" ? (
          <div className="card" style={{ marginTop: 4 }}>
            {templates.length === 0 ? (
              <p className="small">
                No templates yet — <Link href="/acquisition/audiences">create one in the audience library</Link> first.
              </p>
            ) : (
              <>
                <p className="small" style={{ marginBottom: 8 }}>
                  Pick at least one template. Selected templates are cloned into this campaign as
                  audience segments and tagged with their template id.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {templates.map((template) => {
                    const providerFacts = acquisitionProviderTargetingFacts(template.targetingJson);
                    return (
                      <label key={template.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={selectedTemplateIds.includes(template.id)}
                          onChange={() => toggleTemplate(template.id)}
                          style={{ marginTop: 3 }}
                        />
                        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 500 }}>{template.name}</span>
                            <code className="small">{template.audienceType}</code>
                            <span className="small">
                              CPC ${(template.predictedCpcCents / 100).toFixed(2)} · CAC ${(template.predictedCacCents / 100).toFixed(0)}
                            </span>
                          </span>
                          <span className="small">
                            {providerFacts.provider ? (
                              <>
                                {acquisitionProviderLabel(providerFacts.provider)}
                                {providerFacts.externalCampaignId ? ` · campaign ${providerFacts.externalCampaignId}` : ""}
                                {providerFacts.externalChildId ? ` · child ${providerFacts.externalChildId}` : ""}
                              </>
                            ) : (
                              "No provider targeting"
                            )}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : null}
      </fieldset>

      <div className="ctaRow">
        <button
          type="submit"
          disabled={
            loading ||
            channels.length === 0 ||
            (audienceSource === "templates" && selectedTemplateIds.length === 0)
          }
        >
          {loading ? "Creating..." : "Create campaign"}
        </button>
        <Link className="btn" href="/acquisition/simulations">Go to simulations</Link>
      </div>
      {status ? <p className="small" style={{ marginTop: 10 }}>{status}</p> : null}
      {createdCampaign ? (
        <div className="ctaRow" style={{ marginTop: 10 }}>
          <Link className="btn primary" href={`/acquisition/campaigns/${createdCampaign.id}`}>
            Open {createdCampaign.name}
          </Link>
          <Link className="btn" href={`/acquisition/simulations?campaignId=${createdCampaign.id}`}>
            Run simulation
          </Link>
        </div>
      ) : null}
    </form>
  );
}
