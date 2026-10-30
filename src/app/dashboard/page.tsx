import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const { data: onboarding } = await supabase
    .from("onboarding")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!onboarding || !onboarding.completed) {
    redirect("/onboarding");
  }

  // Get business settings
  const { data: business } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <DashboardLayout user={user} businessName={business?.business_name}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {business?.business_name || "your business"}
          </p>
        </div>
        <DashboardStats />
      </div>
    </DashboardLayout>
  );
}
