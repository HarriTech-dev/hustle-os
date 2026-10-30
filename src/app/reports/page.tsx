import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <DashboardLayout user={user} businessName={business?.business_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Business analytics and insights</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Revenue Overview</h3>
            <p className="text-sm text-muted-foreground">Coming soon — track your monthly revenue trends</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Top Customers</h3>
            <p className="text-sm text-muted-foreground">Coming soon — see your highest spending customers</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Inventory Turnover</h3>
            <p className="text-sm text-muted-foreground">Coming soon — analyze product performance</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Growth Forecast</h3>
            <p className="text-sm text-muted-foreground">Coming soon — AI-powered revenue predictions</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
