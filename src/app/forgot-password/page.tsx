
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

      if (resetError) {
        throw resetError;
      }

      // Request accepted. Return to login.
      router.replace("/login?reset=sent");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't request a reset right now. Please try again later."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm space-y-5">

        <h1 className="text-2xl font-bold">
          Reset your password
        </h1>

        <p className="text-muted-foreground">
          Enter the email address you used to register with HustleOS.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-2">
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-background p-3"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary p-3 text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Link href="/login" className="block text-sm underline">
          Back to sign in
        </Link>

      </section>
    </main>
  );
}
