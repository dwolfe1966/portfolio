"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

export function ApplyReserveButton({
  slotId,
  slotName,
  suggestedReserveCents,
  currentReserveCents,
  expectedDailyVolume
}: {
  slotId: string;
  slotName: string;
  suggestedReserveCents: number;
  currentReserveCents: number;
  expectedDailyVolume: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const noChange = suggestedReserveCents === currentReserveCents;

  async function apply() {
    if (noChange) return;
    if (!confirm(`Apply suggested reserve $${(suggestedReserveCents / 100).toFixed(2)} to ${slotName}?`)) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/auction/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: slotName,
          reservePriceCents: suggestedReserveCents,
          expectedDailyVolume
        })
      });
      const json = await response.json();
      if (!json.ok) {
        setStatus(readErrorMessage(json, "Could not apply reserve."));
        return;
      }
      setStatus("Reserve updated.");
      router.refresh();
    } catch {
      setStatus("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={apply} disabled={loading || noChange}>
        {loading ? "Applying..." : noChange ? "No change" : "Apply suggestion"}
      </button>
      {status ? <span className="small" style={{ marginLeft: 8 }}>{status}</span> : null}
    </>
  );
}
