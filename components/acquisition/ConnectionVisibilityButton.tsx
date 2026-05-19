"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

export function ConnectionVisibilityButton({
  id,
  hidden
}: {
  id: string;
  hidden: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function updateVisibility() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !hidden })
      });
      const json = await response.json();
      if (!json.ok) {
        setStatus(readErrorMessage(json, "Could not update visibility."));
        return;
      }
      router.refresh();
    } catch {
      setStatus("Network error while updating visibility.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={updateVisibility} disabled={loading} className="btn smallBtn">
        {loading ? "Updating..." : hidden ? "Unhide" : "Hide"}
      </button>
      {status ? <span className="small" style={{ marginLeft: 8 }}>{status}</span> : null}
    </>
  );
}
