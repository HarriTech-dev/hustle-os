import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { publishListing,unpublishListing } from "./actions";
export default async function MarketplacePage({searchParams}:{searchParams:Promise<{error?:string;published?:string;unpublished?:string}>}){
 const params=await searchParams;const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const [{data:business},{data:inventory},{data:listings}]=await Promise.all([db.from("business_settings").select("business_name").eq("user_id",user.id).maybeSingle(),db.from("inventory").select("id,name,quantity,unit_price,currency").eq("user_id",user.id).order("name").limit(100),db.from("marketplace_listings").select("inventory_id,is_published,whatsapp_number").eq("owner_id",user.id)]);

type MarketplaceListing = {
  inventory_id: string;
  is_published: boolean;
  whatsapp_number: string | null;
};


const published = new Map<string, MarketplaceListing>(
  (listings ?? []).map((x) => [
    x.inventory_id,
    {
      inventory_id: x.inventory_id,
      is_published: x.is_published,
      whatsapp_number: x.whatsapp_number,
    },
  ])
);

 return <DashboardLayout user={user} businessName={business?.business_name}><section className="space-y-6"><div><h1 className="text-3xl font-bold">Marketplace</h1><p>Publish products only when you want them visible to customers. Your WhatsApp number will be publicly displayed through contact links.</p><Link className="underline" href="/shop" target="_blank">View public marketplace</Link></div>{params.error&&<p role="alert" className="text-red-700">{params.error==="invalid"?"Enter a valid product and international WhatsApp number (country code, no +).":"Could not update listing. Check migration 006 and try again."}</p>}{params.published&&<p role="status">Product published.</p>}{params.unpublished&&<p role="status">Product unpublished.</p>}<div className="grid gap-4">{inventory?.map(item=>{const listing=published.get(item.id);return <article key={item.id} className="rounded-xl border p-4 space-y-3"><div className="flex justify-between gap-3"><h2 className="font-semibold">{item.name}</h2><span>{item.currency} {Number(item.unit_price).toLocaleString()}</span></div><p className="text-sm">Stock: {item.quantity} · {listing?.is_published?"Public":"Private"}</p><form action={publishListing} className="flex flex-wrap gap-2 items-end"><input type="hidden" name="inventory_id" value={item.id}/><label className="text-sm">WhatsApp number (international format)<input name="whatsapp_number" defaultValue={listing?.whatsapp_number||""} required pattern="[1-9][0-9]{7,14}" placeholder="2348012345678" className="block rounded border p-2"/></label><button className="rounded bg-foreground text-background px-4 py-2" type="submit">{listing?.is_published?"Update listing":"Publish"}</button></form>{listing?.is_published&&<form action={unpublishListing}><input type="hidden" name="inventory_id" value={item.id}/><button className="rounded border px-4 py-2" type="submit">Unpublish</button></form>}</article>})}{!inventory?.length&&<p>Add products in Inventory before publishing.</p>}</div></section></DashboardLayout>;
}
