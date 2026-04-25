"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Channel = "SEARCH" | "SOCIAL" | "DISPLAY" | "VIDEO";

const DEFAULT_CHANNELS: Channel[] = ["SEARCH", "SOCIAL"];

export function AcquisitionCampaignBuilder() {
  const [name, setName] = useState("May paid growth sprint");
  const [objective, setObjective] = useState("Increase qualified demo requests");
  const [budgetCents, setBudgetCents] = useState(250000);
  const [targetCacCents, setTargetCacCents] = useState(14500);
  const [targetLtvCents, setTargetLtvCents] = useState(72000);
  const [maxBudgetShiftPct, setMaxBudgetShiftPct] = useState(0.2);
  const [minConfidence, setMinConfidence] = useState(0.65);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const startAt = useMemo(() => new Date().toISOString(), []);
  const endAt = useMemo(() => new Date(Date.now() + 14 * 86400000).toISOString(), []);

  function toggleChannel(channel: Channel) {
    setChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/acquisition/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          objective,
          budgetCents,
          startAt,
          endAt,
          channels,
          targetCacCents,
          targetLtvCents,
          maxBudgetShiftPct,
          minConfidence,
          cooldownHours
        })
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        const message = Array.isArray(json.errors) ? json.errors.join(", ") : json.error ?? "Unable to create campaign";
        setStatus(`Error: ${message}`);
        return;
      }

      setStatus(`Created campaign: ${json.campaign.name}. Next: run an iteration in Simulations.`);
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
          Budget (cents)
          <input type="number" min={5000} value={budgetCents} onChange={(event) => setBudgetCents(Number(event.target.value))} />
        </label>
        <label>
          Target CAC (cents)
          <input type="number" min={1000} value={targetCacCents} onChange={(event) => setTargetCacCents(Number(event.target.value))} />
        </label>
        <label>
          Target LTV (cents)
          <input type="number" min={1000} value={targetLtvCents} onChange={(event) => setTargetLtvCents(Number(event.target.value))} />
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

      <div className="ctaRow">
        <button type="submit" disabled={loading || channels.length === 0}>{loading ? "Creating..." : "Create campaign"}</button>
        <Link className="btn" href="/acquisition/simulations">Go to simulations</Link>
      </div>
      {status ? <p className="small" style={{ marginTop: 10 }}>{status}</p> : null}
    </form>
  );
}
