import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Users } from "lucide-react";

export default async function CustomersPage() {
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

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={user} businessName={business?.business_name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage your customer relationships</p>
          </div>
        </div>
        {customers && customers.length > 0 ? (
          <div className="rounded-lg border">
            <div className="grid grid-cols-6 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
              <div>Name</div>
              <div>Email</div>
              <div>Phone</div>
              <div>Company</div>
              <div>Total Spent</div>
              <div>Invoices</div>
            </div>
            {customers.map((customer: any) => (
              <div key={customer.id} className="grid grid-cols-6 gap-4 p-4 text-sm border-b last:border-0">
                <div>{customer.name}</div>
                <div>{customer.email || "—"}</div>
                <div>{customer.phone || "—"}</div>
                <div>{customer.company || "—"}</div>
                <div>₦{customer.total_spent}</div>
                <div>{customer.invoice_count}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No customers yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add your first customer to get started</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
