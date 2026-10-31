import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("business_settings")
    .select("business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,cancel_at_period_end,payment_provider_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fail closed: a paid plan is considered current only while active/trialing and
  // within a known billing period. A browser-visible plan label is never authority.
  const periodEnd = subscription?.current_period_end ? Date.parse(subscription.current_period_end) : NaN;
  const periodValid = Number.isFinite(periodEnd) && periodEnd > Date.now();
  const hasPaidAccess = Boolean(
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    periodValid &&
    (subscription.plan === "growth" || subscription.plan === "pro"),
  );
  const currentPlan = hasPaidAccess ? subscription!.plan : "starter";
  const currentStatus = subscription
    ? subscription.status === "active" && !periodValid
      ? "expired"
      : subscription.status
    : null;

  return (
    <DashboardLayout user={user} businessName={business?.business_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Current plan: <span className="font-semibold capitalize">{currentPlan}</span>
          </p>
          {subscription?.cancel_at_period_end && hasPaidAccess && (
            <p className="mt-1 text-sm text-muted-foreground">Your subscription is set not to renew at the end of the current billing period.</p>
          )}
        </div>
        <SubscriptionCard
          currentPlan={currentPlan}
          currentStatus={currentStatus}
          hasExistingProviderSubscription={Boolean(
            hasPaidAccess || (subscription?.payment_provider_subscription_id && subscription.status !== "cancelled")
          )}
        />
      </div>
    </DashboardLayout>
  );
}
