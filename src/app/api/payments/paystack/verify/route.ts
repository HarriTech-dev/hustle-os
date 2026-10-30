import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAID_PLANS, transactionMatchesExpectedEnvironment, verifyPaystackTransaction } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let reference: unknown;
  try { reference = (await request.json())?.reference; } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof reference !== "string" || !/^hustle_[a-f0-9]{32}$/.test(reference)) {
    return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  }

  let admin;
  try { admin = createAdminClient(); } catch {
    return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
  }
  const { data: attempt, error } = await admin
    .from("subscription_payment_attempts")
    .select("reference,user_id,plan,amount_kobo,currency,status,customer_email")
    .eq("reference", reference)
    .maybeSingle();
  if (error || !attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Payment reference not found." }, { status: 404 });
  }
  if (attempt.status === "succeeded") return NextResponse.json({ status: "success" });
  if (attempt.status !== "pending") return NextResponse.json({ error: "This payment attempt is not pending." }, { status: 409 });

  try {
    const payment = await verifyPaystackTransaction(reference);
    const plan = attempt.plan as keyof typeof PAID_PLANS;
    if (
      payment.status !== "success" ||
      payment.reference !== reference ||
      payment.amount !== attempt.amount_kobo ||
      payment.amount !== PAID_PLANS[plan]?.amountKobo ||
      payment.currency !== attempt.currency ||
      payment.currency !== "NGN" ||
      !transactionMatchesExpectedEnvironment(payment.domain) ||
      (payment.customer?.email && payment.customer.email.toLowerCase() !== attempt.customer_email.toLowerCase())
    ) {
      return NextResponse.json({ error: "Payment has not been verified for this plan." }, { status: 402 });
    }

    const { data: applied, error: applyError } = await admin.rpc("apply_verified_subscription_payment", {
      p_reference: reference,
      p_provider_transaction_id: String(payment.id ?? reference),
      p_verified_amount_kobo: payment.amount,
      p_verified_currency: payment.currency,
    });
    if (applyError) {
      console.error("Subscription activation failed:", applyError.message);
      return NextResponse.json({ error: "Payment was verified but subscription activation needs retry." }, { status: 503 });
    }
    // false means another callback/webhook already applied it; this is an idempotent success.
    return NextResponse.json({ status: "success", alreadyProcessed: applied === false });
  } catch (error) {
    console.error("Payment verification error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to verify payment right now. Please retry shortly." }, { status: 502 });
  }
}
