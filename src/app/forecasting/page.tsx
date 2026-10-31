import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
export default async function Page() {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 const {data:business}=await supabase.from("business_settings").select("business_name").eq("user_id",user.id).maybeSingle();
 const {data:rows,error}=await supabase.from("transactions").select("amount,type,date,currency").eq("user_id",user.id).order("date",{ascending:false}).limit(1000);
 const income=(rows||[]).filter(r=>r.type==="income");
 const currency=income[0]?.currency||"NGN";
 const filtered=income.filter(r=>r.currency===currency);
 const months=new Map<string,number>();
 for(const r of filtered){const key=r.date.slice(0,7);months.set(key,(months.get(key)||0)+Number(r.amount));}
 const values=Array.from(months.entries()).sort(([a],[b])=>a.localeCompare(b)).slice(-6);
 const avg=values.length?values.reduce((a,[,v])=>a+v,0)/values.length:0;
 const change=values.length>=2?(values[values.length-1][1]-values[0][1])/(values.length-1):0;
 const forecast=Math.max(0,avg+change);
 return <DashboardLayout user={user} businessName={business?.business_name}><div className="space-y-6"><h1 className="text-3xl font-bold">Revenue forecasting</h1><p className="text-muted-foreground">Recovered forecasting workflow, adapted to your existing transaction records. Estimates are statistical, not guaranteed or AI-generated.</p>{error?<p role="alert">Unable to load transactions: {error.message}</p>:<><div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border p-6"><p>Average monthly income (recorded months)</p><p className="text-2xl font-bold">{currency} {avg.toLocaleString(undefined,{maximumFractionDigits:2})}</p></div><div className="rounded-xl border p-6"><p>Estimated next-month income</p><p className="text-2xl font-bold">{currency} {forecast.toLocaleString(undefined,{maximumFractionDigits:2})}</p></div></div><div className="rounded-xl border p-6"><h2 className="font-semibold mb-3">Recent income history</h2>{values.length?values.map(([month,total])=><div key={month} className="flex justify-between border-b py-2"><span>{month}</span><span>{currency} {total.toLocaleString()}</span></div>):<p>No income transactions yet. Add transactions to enable forecasting.</p>}</div><p className="text-sm text-muted-foreground">Uses up to 1,000 most recent transactions and a simple linear trend over up to six recorded months. Missing months are not modeled; currencies are not combined.</p></>}</div></DashboardLayout>;
}
