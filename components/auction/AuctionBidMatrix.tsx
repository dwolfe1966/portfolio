"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Advertiser = { id: string; name: string };
type Slot = { id: string; name: string; reservePriceCents: number };
type Bid = { advertiserId: string; slotId: string; bidCents: number };

export function AuctionBidMatrix({
  advertisers,
  slots,
  bids
}: {
  advertisers: Advertiser[];
  slots: Slot[];
  bids: Bid[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Local snapshot of bids — keyed by `${advertiserId}:${slotId}`.
  const initial: Record<string, number> = {};
  for (const b of bids) initial[`${b.advertiserId}:${b.slotId}`] = b.bidCents;
  const [values, setValues] = useState<Record<string, number>>(initial);

  function key(advId: string, slotId: string) {
    return `${advId}:${slotId}`;
  }

  async function commit(advId: string, slotId: string) {
    const k = key(advId, slotId);
    const value = values[k] ?? 0;
    setPending((prev) => ({ ...prev, [k]: true }));
    setErrors((prev) => ({ ...prev, [k]: "" }));
    try {
      const response = await fetch("/api/auction/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertiserId: advId, slotId, bidCents: Math.round(value) })
      });
      const json = await response.json();
      if (!json.ok) {
        const errs = (json.error?.details?.errors as string[] | undefined) ?? [];
        setErrors((prev) => ({ ...prev, [k]: errs[0] ?? "Save failed" }));
        return;
      }
      router.refresh();
    } catch {
      setErrors((prev) => ({ ...prev, [k]: "Network error" }));
    } finally {
      setPending((prev) => ({ ...prev, [k]: false }));
    }
  }

  if (advertisers.length === 0 || slots.length === 0) {
    return (
      <div className="card">
        <p>Add at least one advertiser and one slot before submitting bids.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <h3>Bids (cents per impression)</h3>
      <p className="small">
        Each cell is one advertiser&apos;s bid for one slot. Bids below a slot&apos;s reserve are
        automatically excluded at clearing time. Edit a value and tab away (or click another cell)
        to save.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Advertiser \\ Slot</th>
            {slots.map((slot) => (
              <th key={slot.id}>
                {slot.name}
                <div className="small">reserve ${(slot.reservePriceCents / 100).toFixed(2)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {advertisers.map((adv) => (
            <tr key={adv.id}>
              <th style={{ textAlign: "left" }}>{adv.name}</th>
              {slots.map((slot) => {
                const k = key(adv.id, slot.id);
                const value = values[k] ?? 0;
                return (
                  <td key={slot.id}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={value}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [k]: Number(e.target.value || 0) }))
                      }
                      onBlur={() => commit(adv.id, slot.id)}
                      style={{ width: 96, fontFamily: "var(--demo-mono, monospace)", fontSize: 12 }}
                      disabled={pending[k]}
                    />
                    {errors[k] ? (
                      <div className="small bandText--unhealthy">{errors[k]}</div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
