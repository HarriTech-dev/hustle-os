import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaystackSecretKey, isPaidPlan, PAID_PLANS } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Please sign in before starting a subscription." }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const plan = (body as { plan?: unknown } | null)?.plan;
  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: "Choose a valid paid plan." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: "Payment checkout is not configured yet." }, { status: 503 });
  }

  const reference = `hustle_${randomUUID().replaceAll("-", "")}`;
  const { amountKobo } = PAID_PLANS[plan];
  const planCode = plan === "growth"
    ? process.env.PAYSTACK_GROWTH_PLAN_CODE
    : process.env.PAYSTACK_PRO_PLAN_CODE;
  if (!planCode) {
    return NextResponse.json({ error: `Paystack monthly plan is not configured for ${plan}.` }, { status: 503 });
  }
  let admin;
  let secretKey: string;
  try { admin = createAdminClient(); secretKey = getPaystackSecretKey(); } catch {
    return NextResponse.json({ error: "Payment checkout is not configured yet." }, { status: 503 });
  }

  // Prevent direct API callers from creating duplicate recurring subscriptions.
  const { data: existingSubscription, error: existingSubscriptionError } = await admin
    .from("subscriptions")
    .select("plan,status,current_period_end,payment_provider_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingSubscriptionError) {
    console.error("Could not check existing subscription:", existingSubscriptionError.message);
    return NextResponse.json({ error: "Could not check your current subscription. Please try again." }, { status: 503 });
  }
  const existingPeriodEnd = existingSubscription?.current_period_end
    ? Date.parse(existingSubscription.current_period_end) : NaN;
  const existingPeriodActive = Number.isFinite(existingPeriodEnd) && existingPeriodEnd > Date.now();
  const hasExistingProviderSubscription = Boolean(
    existingSubscription && (
      ((existingSubscription.status === "active" || existingSubscription.status === "trialing") &&
        existingPeriodActive && (existingSubscription.plan === "growth" || existingSubscription.plan === "pro")) ||
      (existingSubscription.payment_provider_subscription_id && existingSubscription.status !== "cancelled")
    )
  );
  if (hasExistingProviderSubscription) {
    return NextResponse.json({ error: "You already have an active or provider-managed subscription. Contact support before changing plans to avoid duplicate charges." }, { status: 409 });
  }

  // Reuse an existing checkout for this account rather than creating a second recurring
  // subscription when a user double-clicks or retries after a slow response.
  const { data: pendingAttempt, error: pendingAttemptError } = await admin
    .from("subscription_payment_attempts")
    .select("reference,plan,authorization_url")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pendingAttemptError) {
    console.error("Could not check pending checkout:", pendingAttemptError.message);
    return NextResponse.json({ error: "Could not check pending checkout. Please try again." }, { status: 503 });
  }
  if (pendingAttempt) {
    if (pendingAttempt.plan !== plan) {
      return NextResponse.json({ error: "You already have a pending checkout for another plan. Finish or resolve it before changing plans." }, { status: 409 });
    }
    if (pendingAttempt.authorization_url) {
      return NextResponse.json({ authorizationUrl: pendingAttempt.authorization_url, reused: true });
    }
    return NextResponse.json({ error: "A checkout is already being prepared. Please retry shortly or contact support if this continues." }, { status: 409 });
  }

  // Basic per-account abuse control. Enforce at the server before calling Paystack.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentAttempts, error: recentAttemptsError } = await admin
    .from("subscription_payment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);
  if (recentAttemptsError) {
    console.error("Could not check checkout rate limit:", recentAttemptsError.message);
    return NextResponse.json({ error: "Could not start checkout right now. Please try again." }, { status: 503 });
  }
  if ((recentAttempts ?? 0) >= 10) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait before trying again." }, { status: 429 });
  }

  // Paystack plan codes override the amount supplied during initialization. Validate the
  // configured provider plan first so a misconfigured dashboard plan cannot charge the wrong price.
  try {
    const planResponse = await fetch(`https://api.paystack.co/plan/${encodeURIComponent(planCode)}`, {
      headers: { Authorization: `Bearer ${secretKey}` }, cache: "no-store",
    });
    const planResult = await planResponse.json();
    const providerPlan = planResult?.data;
    if (!planResponse.ok || planResult?.status !== true ||
        providerPlan?.amount !== amountKobo || providerPlan?.interval !== "monthly" ||
        (providerPlan?.currency && providerPlan.currency !== "NGN")) {
      return NextResponse.json({ error: "The Paystack monthly plan settings do not match this HustleOS plan. Please contact support." }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "Could not validate the Paystack plan configuration." }, { status: 503 });
  }

  const { error: insertError } = await admin.from("subscription_payment_attempts").insert({
    reference,
    user_id: user.id,
    plan,
    amount_kobo: amountKobo,
    currency: "NGN",
    status: "pending",
    customer_email: user.email.toLowerCase(),
    paystack_plan_code: planCode,
  });
  if (insertError) {
    // The partial unique index also closes the race where two requests both checked
    // for a pending checkout before either one inserted its attempt.
    if (insertError.code === "23505") {
      const { data: racedAttempt } = await admin.from("subscription_payment_attempts")
        .select("plan,authorization_url")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (racedAttempt?.plan === plan && racedAttempt.authorization_url) {
        return NextResponse.json({ authorizationUrl: racedAttempt.authorization_url, reused: true });
      }
      return NextResponse.json({ error: "A checkout is already pending for this account. Finish it before starting another." }, { status: 409 });
    }
    console.error("Could not create subscription payment attempt:", insertError.message);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }

  try {
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: String(amountKobo),
        currency: "NGN",
        plan: planCode,
        reference,
        callback_url: `${siteUrl.replace(/\/$/, "")}/settings/subscription?payment=complete&reference=${encodeURIComponent(reference)}`,
        metadata: { user_id: user.id, plan, product: "HustleOS AI" },
      }),
      cache: "no-store",
    });
    const result = await paystackResponse.json();
    if (!paystackResponse.ok || result?.status !== true || !result?.data?.authorization_url) {
      await admin.from("subscription_payment_attempts").update({ status: "failed" }).eq("reference", reference).eq("status", "pending");
      return NextResponse.json({ error: "Paystack could not initialize checkout. Please try again." }, { status: 502 });
    }
    const { error: saveUrlError } = await admin.from("subscription_payment_attempts")
      .update({ authorization_url: result.data.authorization_url })
      .eq("reference", reference)
      .eq("status", "pending");
    if (saveUrlError) {
      console.error("Could not save Paystack checkout URL:", saveUrlError.message);
      await admin.from("subscription_payment_attempts").update({ status: "failed" }).eq("reference", reference).eq("status", "pending");
      return NextResponse.json({ error: "Could not save checkout. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ authorizationUrl: result.data.authorization_url });
  } catch (error) {
    console.error("Paystack initialization error:", error instanceof Error ? error.message : "Unknown error");
    await admin.from("subscription_payment_attempts").update({ status: "failed" }).eq("reference", reference).eq("status", "pending");
    return NextResponse.json({ error: "Unable to connect to the payment provider." }, { status: 502 });
  }
}
