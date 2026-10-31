"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const prepare = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const urlError = url.searchParams.get("error_description");
        if (urlError) throw new Error(urlError);

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type === "recovery") {
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (verifyError) throw verifyError;
        } else if (window.location.hash.includes("access_token=")) {
          // Supabase's browser client processes implicit-flow tokens from the URL hash.
          await new Promise<void>((resolve) => {
            const timeout = window.setTimeout(resolve, 1800);
            const { data: listener } = supabase.auth.onAuthStateChange(() => {
              window.clearTimeout(timeout);
              listener.subscription.unsubscribe();
              resolve();
            });
          });
        }
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (active) setReady(Boolean(user));
        if (user && (code || tokenHash || window.location.hash)) {
          window.history.replaceState({}, "", "/reset-password");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Recovery link could not be verified.");
      } finally {
        if (active) setChecking(false);
      }
    };
    void prepare();
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
      {checking && <p className="text-sm">Verifying your recovery link...</p>}
      {!checking && !ready && <p className="text-sm">No valid recovery session found. Open a fresh reset link from your email, or request a new one.</p>}
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
