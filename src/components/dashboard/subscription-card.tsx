"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Check, LockKeyhole, LoaderCircle } from "lucide-react";

type PlanId = "starter" | "growth" | "pro";
type SubscriptionCardProps = {
  currentPlan?: string | null;
  currentStatus?: string | null;
  hasExistingProviderSubscription?: boolean;
};

const plans: Array<{
  id: PlanId; name: string; price: string; description: string; features: string[]; highlighted?: boolean;
}> = [
  { id: "starter", name: "Starter", price: "Free", description: "Perfect for getting started", features: ["Up to 50 invoices", "Basic inventory tracking", "Email support", "1 user"] },
  { id: "growth", name: "Growth", price: "₦9,900/mo", description: "For growing businesses", features: ["Unlimited invoices", "Advanced inventory", "Priority support", "5 team members", "AI Advisor", "Reports & analytics"], highlighted: true },
  { id: "pro", name: "Pro", price: "₦24,900/mo", description: "For established businesses", features: ["Everything in Growth", "Unlimited team members", "Custom integrations", "Dedicated account manager", "API access", "White-label options"] },
];

export function SubscriptionCard({
  currentPlan = "starter",
  currentStatus,
  hasExistingProviderSubscription = false,
}: SubscriptionCardProps) {
  const router = useRouter();
  const startedCallbackCheck = useRef(false);
  const [loadingPlan, setLoadingPlan] = useState<"growth" | "pro" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const normalizedPlan = plans.some((plan) => plan.id === currentPlan) ? currentPlan as PlanId : "starter";

  useEffect(() => {
    if (startedCallbackCheck.current) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (params.get("payment") !== "complete" || !reference) return;
    startedCallbackCheck.current = true;
    setMessage("Checking your payment with Paystack. Your plan will update only after server verification.");
    void (async () => {
      try {
        const response = await fetch("/api/payments/paystack/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Payment verification is still pending.");
        setMessage("Payment verified. Your subscription is being refreshed.");
        window.history.replaceState({}, "", window.location.pathname);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not verify payment. Please refresh in a moment.");
      }
    })();
  }, [router]);

  async function beginCheckout(plan: "growth" | "pro") {
    setLoadingPlan(plan); setMessage(null); setErrorMessage(null);
    try {
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.authorizationUrl !== "string") {
        throw new Error(result.error || "Unable to start checkout.");
      }
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start checkout. Please try again.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-medium">Subscriptions are verified securely</p>
          <p className="text-sm text-muted-foreground">Paystack checkout is initiated on the server. A paid plan is activated only after server-side verification of the payment and amount.</p>
          {currentStatus && <p className="mt-1 text-xs text-muted-foreground">Status: {currentStatus.replaceAll("_", " ")}</p>}
        </div>
      </div>
      {message && <p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
      {errorMessage && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{errorMessage}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = normalizedPlan === plan.id;
          const isPaid = plan.id === "growth" || plan.id === "pro";
          const isLoading = loadingPlan === plan.id;
          return (
            <Card key={plan.id} className={plan.highlighted ? "border-primary shadow-lg relative" : "border-border"}>
              {plan.highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Most Popular</div>}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4"><span className="text-3xl font-bold">{plan.price}</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{feature}</li>)}</ul>
                <Button
                  className={`mt-6 w-full ${plan.highlighted ? "bg-primary text-primary-foreground" : ""}`}
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={Boolean(loadingPlan) || isCurrent || !isPaid || hasExistingProviderSubscription}
                  onClick={() => isPaid && !hasExistingProviderSubscription && void beginCheckout(plan.id as "growth" | "pro")}
                >
                  {isLoading ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Connecting to Paystack…</> : isCurrent ? <><Crown className="h-4 w-4" aria-hidden="true" /> Current Plan</> : plan.id === "starter" ? "Included" : hasExistingProviderSubscription ? "Existing subscription" : `Subscribe to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {hasExistingProviderSubscription && (
        <p className="text-sm text-muted-foreground">An existing paid or provider-managed subscription was found. New subscriptions are blocked to prevent duplicate monthly charges. Contact support to change or resolve the existing subscription.</p>
      )}
      <p className="text-xs text-muted-foreground">Monthly billing requires Paystack plan codes to be configured on the server. Do not add your Paystack secret key to any variable beginning with NEXT_PUBLIC_.</p>
    </div>
  );
}
