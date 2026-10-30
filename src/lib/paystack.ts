import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type PaidPlan = "growth" | "pro";

/** Prices are server-owned and expressed in NGN kobo (₦1 = 100 kobo). */
export const PAID_PLANS: Record<PaidPlan, { amountKobo: number; label: string }> = {
  growth: { amountKobo: 990_000, label: "Growth" },
  pro: { amountKobo: 2_490_000, label: "Pro" },
};

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "growth" || value === "pro";
}

export function getPaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !/^sk_(test|live)_[A-Za-z0-9_]+$/.test(key)) {
    throw new Error("PAYSTACK_SECRET_KEY is missing or invalid.");
  }
  return key;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", getPaystackSecretKey()).update(rawBody).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${getPaystackSecretKey()}` },
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Paystack transaction verification failed.");
  const result = await response.json();
  if (result?.status !== true || !result?.data) {
    throw new Error("Paystack returned an invalid verification response.");
  }
  return result.data as {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    domain?: string;
    customer?: { email?: string };
    id?: number | string;
  };
}

export function transactionMatchesExpectedEnvironment(domain?: string) {
  const configured = process.env.PAYSTACK_EXPECTED_DOMAIN;
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const expected = configured || (secret?.startsWith("sk_test_") ? "test" : secret?.startsWith("sk_live_") ? "live" : "");
  return Boolean(expected) && domain === expected;
}
