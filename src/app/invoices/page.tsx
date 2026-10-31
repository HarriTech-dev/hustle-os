import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default async function InvoicesPage() {
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

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={user} businessName={business?.business_name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage and track your invoices</p>
          </div>
        </div>
        {invoices && invoices.length > 0 ? (
          <div className="rounded-lg border">
            <div className="grid grid-cols-6 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
              <div>Customer</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Due Date</div>
              <div>Created</div>
              <div>Actions</div>
            </div>
            {invoices.map((invoice: any) => (
              <div key={invoice.id} className="grid grid-cols-6 gap-4 p-4 text-sm border-b last:border-0">
                <div>{invoice.customer_name}</div>
                <div>
                  {invoice.currency} {invoice.amount}
                </div>
                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      invoice.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : invoice.status === "overdue"
                        ? "bg-red-100 text-red-700"
                        : invoice.status === "sent"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </div>
                <div>{invoice.due_date}</div>
                <div>{new Date(invoice.created_at).toLocaleDateString()}</div>
                <div>View</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">No invoices yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first invoice to get started</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
