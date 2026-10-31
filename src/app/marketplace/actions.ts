"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function publishListing(form:FormData){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const id=String(form.get("inventory_id")||"");const number=String(form.get("whatsapp_number")||"").replace(/[\s+()-]/g,"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[1-9][0-9]{7,14}$/.test(number))redirect("/marketplace?error=invalid");
 const {data:item}=await db.from("inventory").select("id,name,description,unit_price,currency").eq("id",id).eq("user_id",user.id).maybeSingle();
 if(!item)redirect("/marketplace?error=invalid");
 const {error}=await db.from("marketplace_listings").upsert({owner_id:user.id,inventory_id:item.id,title:item.name,description:item.description,price:item.unit_price,currency:item.currency,whatsapp_number:number,is_published:true,updated_at:new Date().toISOString()},{onConflict:"owner_id,inventory_id"});
 if(error)redirect("/marketplace?error=save");revalidatePath("/marketplace");revalidatePath("/shop");redirect("/marketplace?published=1");
}
export async function unpublishListing(form:FormData){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");const id=String(form.get("inventory_id")||"");if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/marketplace?error=invalid");const {error}=await db.from("marketplace_listings").update({is_published:false,updated_at:new Date().toISOString()}).eq("owner_id",user.id).eq("inventory_id",id);if(error)redirect("/marketplace?error=save");revalidatePath("/marketplace");revalidatePath("/shop");redirect("/marketplace?unpublished=1");}
