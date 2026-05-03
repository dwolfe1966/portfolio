"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

const SEGMENTS = ["FREE", "TRIAL", "LAPSED", "ACTIVE"];
const STATUSES = ["NONE", "TRIALING", "ACTIVE", "CANCELED", "EXPIRED"];

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  segment: string;
  subscriptionStatus: string;
};

type EntityRow = {
  id: string;
  name: string;
  entityType: string;
  city: string | null;
  state: string | null;
};

type InterestEdgeRow = {
  id: string;
  interestScore: number;
  source: string;
  user: { fullName: string };
  entity: { name: string };
};

function SaveStatus({ value }: { value: string }) {
  return value ? <p className="saveStatus">{value}</p> : null;
}

export function LifecycleUserEditor({ user }: { user: UserRow }) {
  const router = useRouter();
  const [form, setForm] = useState(user);
  const [status, setStatus] = useState("");

  async function save() {
    setStatus("");
    const response = await fetch(`/api/lifecycle/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setStatus(response.ok ? "Saved." : readErrorMessage(payload, "Save failed."));
    if (response.ok) router.refresh();
  }

  return (
    <tr>
      <td><input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></td>
      <td><input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></td>
      <td>
        <select value={form.segment} onChange={(event) => setForm((current) => ({ ...current, segment: event.target.value }))}>
          {SEGMENTS.map((segment) => <option key={segment} value={segment}>{segment}</option>)}
        </select>
      </td>
      <td>
        <select value={form.subscriptionStatus} onChange={(event) => setForm((current) => ({ ...current, subscriptionStatus: event.target.value }))}>
          {STATUSES.map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption}</option>)}
        </select>
        <SaveStatus value={status} />
      </td>
      <td><button type="button" onClick={save}>Save</button></td>
    </tr>
  );
}

export function LifecycleEntityEditor({ entity }: { entity: EntityRow }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: entity.name,
    entityType: entity.entityType,
    city: entity.city ?? "",
    state: entity.state ?? ""
  });
  const [status, setStatus] = useState("");

  async function save() {
    setStatus("");
    const response = await fetch(`/api/lifecycle/entities/${entity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setStatus(response.ok ? "Saved." : readErrorMessage(payload, "Save failed."));
    if (response.ok) router.refresh();
  }

  return (
    <tr>
      <td><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></td>
      <td><input value={form.entityType} onChange={(event) => setForm((current) => ({ ...current, entityType: event.target.value }))} /></td>
      <td><input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></td>
      <td>
        <input value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} />
        <SaveStatus value={status} />
      </td>
      <td><button type="button" onClick={save}>Save</button></td>
    </tr>
  );
}

export function LifecycleInterestEdgeEditor({ edge }: { edge: InterestEdgeRow }) {
  const router = useRouter();
  const [form, setForm] = useState({
    interestScore: edge.interestScore,
    source: edge.source
  });
  const [status, setStatus] = useState("");

  async function save() {
    setStatus("");
    const response = await fetch(`/api/lifecycle/interest-edges/${edge.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setStatus(response.ok ? "Saved." : readErrorMessage(payload, "Save failed."));
    if (response.ok) router.refresh();
  }

  return (
    <tr>
      <td>{edge.user.fullName}</td>
      <td>{edge.entity.name}</td>
      <td><input type="number" min={0} max={1} step={0.01} value={form.interestScore} onChange={(event) => setForm((current) => ({ ...current, interestScore: Number(event.target.value || 0) }))} /></td>
      <td>
        <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
        <SaveStatus value={status} />
      </td>
      <td><button type="button" onClick={save}>Save</button></td>
    </tr>
  );
}
