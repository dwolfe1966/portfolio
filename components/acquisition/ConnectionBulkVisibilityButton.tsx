"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

export function ConnectionBulkVisibilityButton({
  ids,
  hidden
}: {
  ids: string[];
  hidden: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function updateVisibility() {
    if (ids.length === 0) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, hidden })
      });
      const json = await response.json();
      if (!json.ok) {
        setStatus(readErrorMessage(json, "Could not update account visibility."));
        return;
      }
      setStatus(`${json.updated ?? 0} accounts updated.`);
      router.refresh();
    } catch {
      setStatus("Network error while updating accounts.");
    } finally {
      setLoading(false);
    }
  }

  const action = hidden ? "Hide" : "Unhide";

  return (
    <>
      <button type="button" onClick={updateVisibility} disabled={loading || ids.length === 0} className="btn smallBtn">
        {loading ? "Updating..." : `${action} displayed`}
      </button>
      {status ? <span className="small" style={{ marginLeft: 8 }}>{status}</span> : null}
    </>
  );
}
