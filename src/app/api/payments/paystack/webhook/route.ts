import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAID_PLANS, transactionMatchesExpectedEnvironment, verifyPaystackSignature, verifyPaystackTransaction } from "@/lib/paystack";

export const runtime = "nodejs";

function getSubscriptionCode(data: any): string | null {
  const value = data?.subscription_code ?? data?.subscription?.subscription_code ?? data?.subscription?.code;
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function readLimitedBody(request: Request, maxBytes = 1_000_000): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("WEBHOOK_BODY_TOO_LARGE");
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("WEBHOOK_BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

export async function POST(request: Request) {
  let rawBody: string;
  try { rawBody = await readLimitedBody(request); } catch (error) {
    if (error instanceof Error && error.message === "WEBHOOK_BODY_TOO_LARGE") {
      return NextResponse.json({ error: "Webhook payload too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Could not read webhook payload." }, { status: 400 });
  }
  let validSignature = false;
  try { validSignature = verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature")); } catch {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  if (!validSignature) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });

  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const data = event?.data;

    // Paystack emits subscription.create separately from the initial charge. Link the
    // provider's subscription code to the exact pending/succeeded checkout by email + plan.
    if (event?.event === "subscription.create") {
      const subscriptionCode = getSubscriptionCode(data);
      const email = data?.customer?.email;
      const planCode = data?.plan?.plan_code ?? data?.plan_code;
      const nextPaymentDate = data?.next_payment_date ?? data?.subscription?.next_payment_date;
      if (subscriptionCode && typeof email === "string" && typeof planCode === "string") {
        const { data: attempts, error: lookupError } = await admin.from("subscription_payment_attempts")
          .select("reference,user_id,plan,status")
          .eq("customer_email", email.toLowerCase())
          .eq("paystack_plan_code", planCode)
          .in("status", ["pending", "succeeded"])
          .is("paystack_subscription_code", null)
          .order("created_at", { ascending: false })
          .limit(2);
        // Fail closed if more than one checkout could match this provider event.
        if (!lookupError && attempts?.length === 1) {
          const matchedAttempt = attempts[0];
          await admin.from("subscription_payment_attempts")
            .update({
              paystack_subscription_code: subscriptionCode,
              ...(typeof nextPaymentDate === "string" && !Number.isNaN(Date.parse(nextPaymentDate))
                ? { paystack_next_payment_date: nextPaymentDate } : {}),
            })
            .eq("reference", matchedAttempt.reference)
            .is("paystack_subscription_code", null);
          if (matchedAttempt.status === "succeeded") {
            await admin.from("subscriptions")
              .update({
                payment_provider_subscription_id: subscriptionCode,
                ...(typeof nextPaymentDate === "string" && !Number.isNaN(Date.parse(nextPaymentDate))
                  ? { current_period_end: nextPaymentDate } : {}),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", matchedAttempt.user_id)
              .eq("payment_provider", "paystack");
          }
        }
      }
      return NextResponse.json({ received: true });
    }

    // Mark a recurring subscription past due when Paystack reports an invoice failure.
    if (["invoice.payment_failed", "invoice.failed"].includes(event?.event) ||
        (event?.event === "invoice.update" && ["failed", "overdue"].includes(String(data?.status).toLowerCase()))) {
      const subscriptionCode = getSubscriptionCode(data);
      if (subscriptionCode) {
        await admin.from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("payment_provider", "paystack")
          .eq("payment_provider_subscription_id", subscriptionCode);
      }
      return NextResponse.json({ received: true });
    }

    // invoice.update carries the final invoice status and charge details. Process a successful
    // renewal here too, because the charge.success event shape may not expose subscription_code.
    if (event?.event === "invoice.update" && ["success", "paid"].includes(String(data?.status).toLowerCase())) {
      const subscriptionCode = getSubscriptionCode(data);
      const reference = data?.transaction?.reference ?? data?.charge?.reference ?? data?.reference;
      if (subscriptionCode && typeof reference === "string" && reference.length > 0) {
        const payment = await verifyPaystackTransaction(reference);
        const { data: subscription } = await admin.from("subscriptions")
          .select("plan,payment_provider_subscription_id")
          .eq("payment_provider", "paystack")
          .eq("payment_provider_subscription_id", subscriptionCode)
          .maybeSingle();
        if (subscription && payment.status === "success" && payment.reference === reference &&
            transactionMatchesExpectedEnvironment(payment.domain)) {
          const expectedAmount = PAID_PLANS[subscription.plan as keyof typeof PAID_PLANS]?.amountKobo;
          if (expectedAmount && payment.amount === expectedAmount && payment.currency === "NGN") {
            const { error: renewalError } = await admin.rpc("apply_verified_subscription_renewal", {
              p_reference: reference,
              p_provider_transaction_id: String(payment.id ?? reference),
              p_subscription_code: subscriptionCode,
              p_verified_amount_kobo: payment.amount,
              p_verified_currency: payment.currency,
            });
            if (renewalError) throw renewalError;
          }
        }
      }
      return NextResponse.json({ received: true });
    }

    if (["subscription.not_renew", "subscription.disable"].includes(event?.event)) {
      const subscriptionCode = getSubscriptionCode(data);
      if (subscriptionCode) {
        const isDisabled = event.event === "subscription.disable";
        await admin.from("subscriptions")
          .update({
            ...(isDisabled ? { status: "cancelled", cancel_at_period_end: false } : { cancel_at_period_end: true }),
            updated_at: new Date().toISOString(),
          })
          .eq("payment_provider", "paystack")
          .eq("payment_provider_subscription_id", subscriptionCode);
      }
      return NextResponse.json({ received: true });
    }

    if (event?.event !== "charge.success") return NextResponse.json({ received: true });
    const reference = data?.reference;
    if (typeof reference !== "string" || reference.length === 0 || reference.length > 200) {
      return NextResponse.json({ received: true });
    }

    const { data: attempt, error } = await admin.from("subscription_payment_attempts")
      .select("reference,user_id,plan,amount_kobo,currency,status,customer_email")
      .eq("reference", reference)
      .maybeSingle();
    if (error) throw error;

    // A later recurring charge has a new reference, so it is not in the initial checkout ledger.
    if (!attempt) {
      const payment = await verifyPaystackTransaction(reference);
      const subscriptionCode = getSubscriptionCode(data) ?? getSubscriptionCode(payment);
      if (payment.status !== "success" || payment.reference !== reference ||
          !transactionMatchesExpectedEnvironment(payment.domain) || !subscriptionCode) {
        return NextResponse.json({ received: true });
      }
      const { data: subscription } = await admin.from("subscriptions")
        .select("plan,payment_provider_subscription_id")
        .eq("payment_provider", "paystack")
        .eq("payment_provider_subscription_id", subscriptionCode)
        .maybeSingle();
      if (!subscription) return NextResponse.json({ received: true });
      const expectedAmount = PAID_PLANS[subscription.plan as keyof typeof PAID_PLANS]?.amountKobo;
      if (!expectedAmount || payment.amount !== expectedAmount || payment.currency !== "NGN") {
        console.error("Recurring payment did not match subscription amount:", reference);
        return NextResponse.json({ error: "Recurring payment did not match." }, { status: 400 });
      }
      const { error: renewalError } = await admin.rpc("apply_verified_subscription_renewal", {
        p_reference: reference,
        p_provider_transaction_id: String(payment.id ?? reference),
        p_subscription_code: subscriptionCode,
        p_verified_amount_kobo: payment.amount,
        p_verified_currency: payment.currency,
      });
      if (renewalError) throw renewalError;
      return NextResponse.json({ received: true });
    }

    // Duplicate initial charge event: safely attach the provider subscription code if available,
    // then acknowledge without extending the term a second time.
    if (attempt.status === "succeeded") {
      const subscriptionCode = getSubscriptionCode(data);
      if (subscriptionCode) {
        await admin.from("subscription_payment_attempts")
          .update({ paystack_subscription_code: subscriptionCode })
          .eq("reference", reference)
          .is("paystack_subscription_code", null);
        await admin.from("subscriptions")
          .update({ payment_provider_subscription_id: subscriptionCode, updated_at: new Date().toISOString() })
          .eq("user_id", attempt.user_id)
          .eq("payment_provider", "paystack");
      }
      return NextResponse.json({ received: true });
    }
    if (attempt.status !== "pending") return NextResponse.json({ received: true });

    // Independently verify with Paystack. Never grant access based on webhook JSON alone.
    const payment = await verifyPaystackTransaction(reference);
    const plan = attempt.plan as keyof typeof PAID_PLANS;
    if (
      payment.status !== "success" || payment.reference !== reference ||
      payment.amount !== attempt.amount_kobo || payment.amount !== PAID_PLANS[plan]?.amountKobo ||
      payment.currency !== attempt.currency || payment.currency !== "NGN" ||
      !transactionMatchesExpectedEnvironment(payment.domain) ||
      (payment.customer?.email && payment.customer.email.toLowerCase() !== attempt.customer_email.toLowerCase())
    ) {
      console.error("Paystack webhook did not match expected payment:", reference);
      return NextResponse.json({ error: "Payment details did not match." }, { status: 400 });
    }

    const subscriptionCode = getSubscriptionCode(data) ?? getSubscriptionCode(payment);
    if (subscriptionCode) {
      await admin.from("subscription_payment_attempts")
        .update({ paystack_subscription_code: subscriptionCode })
        .eq("reference", reference)
        .eq("status", "pending")
        .is("paystack_subscription_code", null);
    }

    const { error: applyError } = await admin.rpc("apply_verified_subscription_payment", {
      p_reference: reference,
      p_provider_transaction_id: String(payment.id ?? reference),
      p_verified_amount_kobo: payment.amount,
      p_verified_currency: payment.currency,
    });
    if (applyError) throw applyError;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook processing failed:", error instanceof Error ? error.message : "Unknown error");
    // A non-2xx response asks Paystack to retry. DB functions make successful processing idempotent.
    return NextResponse.json({ error: "Webhook processing failed; retry delivery." }, { status: 500 });
  }
}
