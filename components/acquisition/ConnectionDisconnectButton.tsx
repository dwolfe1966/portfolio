"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

export function ConnectionDisconnectButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function disconnect() {
    if (!confirm(`Disconnect ${label}? Stored OAuth tokens will be deleted.`)) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/connections/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.ok) {
        setStatus(readErrorMessage(json, "Could not disconnect."));
        return;
      }
      router.refresh();
    } catch {
      setStatus("Network error while disconnecting.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={disconnect} disabled={loading} className="btn">
        {loading ? "Disconnecting..." : "Disconnect"}
      </button>
      {status ? <span className="small" style={{ marginLeft: 8 }}>{status}</span> : null}
    </>
  );
}
