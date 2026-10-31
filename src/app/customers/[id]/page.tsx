import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { updateCustomer } from "../actions";

export default async function CustomerDetails({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: customer }, { data: business }] = await Promise.all([
    db.from("customers").select("id,name,email,phone,company,address,created_at,total_spent,invoice_count").eq("id", id).eq("user_id", user.id).maybeSingle(),
    db.from("business_settings").select("business_name").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!customer) notFound();
  // Legacy invoices have no customer_id; only match a nonempty email within this account.
  const invoices = customer.email ? (await db.from("invoices")
    .select("id,customer_name,amount,currency,status,due_date,created_at")
    .eq("user_id", user.id).ilike("customer_email", customer.email)
    .order("created_at", { ascending: false }).limit(50)).data ?? [] : [];
  return <DashboardLayout user={user} businessName={business?.business_name}>
    <main className="space-y-6">
      <Link href="/customers" className="text-sm underline">← Back to customers</Link>
      <div><h1 className="text-3xl font-bold">{customer.name}</h1><p className="text-muted-foreground">Customer profile and invoice matches</p></div>
      {query.updated === "1" && <p role="status" className="rounded border p-3">Customer updated successfully.</p>}
      {query.error && <p role="alert" className="rounded border p-3 text-red-600">{query.error === "invalid" ? "Please check the name and email." : "Update failed. Please retry."}</p>}
      <form action={updateCustomer} className="rounded-xl border p-5 space-y-4">
        <h2 className="text-xl font-semibold">Edit customer</h2><input type="hidden" name="id" value={customer.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          {([ ["name", "Name", customer.name], ["email", "Email", customer.email], ["phone", "Phone", customer.phone], ["company", "Company", customer.company], ["address", "Address", customer.address] ] as const).map(([key,label,value]) =>
            <label key={key} className="text-sm">{label}<input name={key} type={key === "email" ? "email" : "text"} required={key === "name"} maxLength={key === "address" ? 500 : key === "email" ? 254 : key === "phone" ? 40 : 150} defaultValue={value ?? ""} className="mt-1 block w-full rounded-md border bg-background p-2" /></label>)}
        </div><button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Save changes</button>
      </form>
      <section className="rounded-xl border p-5 space-y-3"><h2 className="text-xl font-semibold">Invoice history (email matches)</h2>
        <p className="text-sm text-muted-foreground">Invoices are matched using the customer email, not a permanent customer ID. Results may be incomplete or include records sharing the same email. Showing up to 50 recent matches.</p>
        {invoices.length === 0 ? <p>No matching invoices found.</p> : <div className="space-y-2">{invoices.map((invoice) =>
          <div key={invoice.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"><span>{new Date(invoice.created_at).toLocaleDateString()} — {invoice.status}</span><span>{invoice.currency} {Number(invoice.amount).toLocaleString()}</span></div>)}</div>}
      </section>
    </main>
  </DashboardLayout>;
}
