import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default async function AdvisorPage() {
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user) redirect("/login");
 const [{data:business},{data:stock, error:stockError},{data:invoices,error:invoiceError},{data:transactions,error:transactionError}]=await Promise.all([
  db.from("business_settings").select("business_name").eq("user_id",user.id).maybeSingle(),
  db.from("inventory").select("id,name,quantity").eq("user_id",user.id).limit(500),
  db.from("invoices").select("id,amount,due_date,status").eq("user_id",user.id).limit(500),
  db.from("transactions").select("amount,type,date,currency").eq("user_id",user.id).order("date",{ascending:false}).limit(500)
 ]);
 const today=new Date().toISOString().slice(0,10);
 const low=(stock||[]).filter(i=>Number(i.quantity)<=5);
 const overdue=(invoices||[]).filter(i=>i.due_date && i.due_date<today && !["paid","cancelled","canceled"].includes(i.status));
 const income=(transactions||[]).filter(t=>t.type==="income");
 const expenses=(transactions||[]).filter(t=>t.type==="expense");
 const currencies=[...new Set((transactions||[]).map(t=>t.currency||"unknown"))];
 const insights=[
  {title:"Inventory attention",detail:low.length?`${low.length} product(s) have five or fewer units. Check replenishment before promoting these products.`:"No products with five or fewer units were found in the records checked."},
  {title:"Outstanding invoices",detail:overdue.length?`${overdue.length} invoice(s) appear overdue. Follow up with customers and confirm payments before changing invoice status.`:"No overdue invoices were found in the records checked."},
  {title:"Cash flow",detail:currencies.length===1?`Recorded income: ${income.reduce((s,t)=>s+Number(t.amount),0).toLocaleString()} ${currencies[0]}; recorded expenses: ${expenses.reduce((s,t)=>s+Number(t.amount),0).toLocaleString()} ${currencies[0]}. Review the dates and reconcile with bank records.`:"Multiple currencies or no transactions detected; review cash flow by currency rather than combining amounts."}
 ];
 return <DashboardLayout user={user} businessName={business?.business_name}><main className="space-y-6"><h1 className="text-3xl font-bold">Business advisor</h1><p className="text-muted-foreground">Actionable, rule-based recommendations based on your own records. This version does not send your business data to an external AI provider.</p>{stockError||invoiceError||transactionError?<p role="alert" className="text-red-600">Some data could not be loaded. Recommendations may be incomplete: {[stockError?.message,invoiceError?.message,transactionError?.message].filter(Boolean).join("; ")}</p>:null}<div className="grid gap-4 md:grid-cols-2">{insights.map(i=><section key={i.title} className="rounded-xl border p-6 space-y-2"><h2 className="text-lg font-semibold">{i.title}</h2><p>{i.detail}</p></section>)}</div><p className="text-sm text-muted-foreground">Limited to the most recent 500 records per source. Recommendations are informational and not financial advice.</p></main></DashboardLayout>;
}
