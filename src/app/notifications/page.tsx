import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
export default async function Page() {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 const {data:business}=await supabase.from("business_settings").select("business_name").eq("user_id",user.id).maybeSingle();
 const today=new Date().toISOString().slice(0,10);
 const [invoices,stock]=await Promise.all([supabase.from("invoices").select("id,customer_name,due_date,status,amount").eq("user_id",user.id).in("status",["sent","overdue"]).lte("due_date",today).limit(50),supabase.from("inventory").select("id,name,quantity").eq("user_id",user.id).lte("quantity",5).limit(50)]);
 return <DashboardLayout user={user} businessName={business?.business_name}><div className="space-y-6"><h1 className="text-3xl font-bold">Notifications</h1><p className="text-muted-foreground">Live alerts generated from your own invoice and inventory records.</p>{invoices.error||stock.error?<p role="alert">Could not load alerts: {invoices.error?.message||stock.error?.message}</p>:<><section className="rounded-xl border p-6"><h2 className="font-semibold mb-3">Due or overdue invoices</h2>{invoices.data?.length?invoices.data.map(i=><div className="border-b py-2" key={i.id}>{i.customer_name} — due {i.due_date} ({i.status})</div>):<p>No invoice alerts.</p>}</section><section className="rounded-xl border p-6"><h2 className="font-semibold mb-3">Low stock (5 or fewer units)</h2>{stock.data?.length?stock.data.map(i=><div className="border-b py-2" key={i.id}>{i.name}: {i.quantity} units</div>):<p>No low-stock alerts.</p>}</section></>}</div></DashboardLayout>;
}
