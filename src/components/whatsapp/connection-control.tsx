"use client";
import { useState } from "react";
export function ConnectionControl({ id, initiallyEnabled }: { id: string; initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function disable() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/whatsapp/connections/${encodeURIComponent(id)}/settings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ai_enabled: false }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Update failed");
      setEnabled(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); }
    finally { setBusy(false); }
  }
  return <div className="mt-2 space-y-2"><p className="text-sm">AI automation: {enabled ? "On (disable immediately)" : "Off"}</p>
    {enabled && <button type="button" disabled={busy} onClick={disable} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">{busy ? "Disabling…" : "Disable AI automation"}</button>}
    {!enabled && <p className="text-xs text-muted-foreground">Automatic replies are locked until onboarding, outbound messaging and safety tests pass.</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
