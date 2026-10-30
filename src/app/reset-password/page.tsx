"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setReady(Boolean(data.user)); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy) return;
    setError("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Password updated successfully. You can now sign in.");
      setPassword("");
      setConfirm("");
      await supabase.auth.signOut();
    } catch {
      setError("Could not update your password. Request a fresh reset link and try again.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm space-y-5">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {!ready && <p className="text-sm">No valid recovery session found. Open the reset link from your email, or request a new one.</p>}
      {ready && !message && <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2">New password
          <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-md border bg-background p-3" />
        </label>
        <label className="block space-y-2">Confirm new password
          <input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-md border bg-background p-3" />
        </label>
        <button type="submit" disabled={busy} className="w-full rounded-md bg-primary p-3 text-primary-foreground disabled:opacity-60">{busy ? "Updating..." : "Update password"}</button>
      </form>}
      {message && <p role="status" className="text-sm">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Link href="/forgot-password" className="block text-sm underline">Request a new link</Link>
      <Link href="/login" className="block text-sm underline">Back to sign in</Link>
    </section>
  </main>;
}
