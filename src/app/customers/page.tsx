import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Users } from "lucide-react";
import Link from "next/link";
import { addCustomer } from "./actions";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const params = await searchParams;
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
        {params.created === "1" && <p role="status" className="rounded-lg border p-3">Customer added successfully.</p>}
        {params.error && <p role="alert" className="rounded-lg border p-3 text-red-600">{params.error === "invalid" ? "Please enter a valid name and email." : "Could not save customer. Please try again."}</p>}
        <form action={addCustomer} className="rounded-xl border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Add customer</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Name *<input required name="name" maxLength={150} className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm">Email<input name="email" type="email" maxLength={254} className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm">Phone<input name="phone" type="tel" maxLength={40} className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm">Company<input name="company" maxLength={150} className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm sm:col-span-2">Address<input name="address" maxLength={500} className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
          </div>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Save customer</button>
        </form>
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
                <div><Link className="font-medium underline underline-offset-2" href={`/customers/${customer.id}`}>{customer.name}</Link></div>
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
