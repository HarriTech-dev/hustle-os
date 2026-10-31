"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addCustomer(formData: FormData) {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) redirect("/login");

  const read = (key: string, max: number) => {
    const raw = formData.get(key);
    return typeof raw === "string" ? raw.trim().slice(0, max) : "";
  };
  const name = read("name", 150);
  const email = read("email", 254);
  const phone = read("phone", 40);
  const company = read("company", 150);
  const address = read("address", 500);
  if (!name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    redirect("/customers?error=invalid");
  }
  const { error } = await db.from("customers").insert({
    user_id: user.id,
    name,
    email: email || null,
    phone: phone || null,
    company: company || null,
    address: address || null,
  });
  if (error) redirect("/customers?error=save");
  revalidatePath("/customers");
  redirect("/customers?created=1");
}


export async function updateCustomer(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) redirect("/customers?error=invalid");
  const field = (name: string, max: number) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  };
  const name = field("name", 150);
  const email = field("email", 254);
  if (!name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) redirect(`/customers/${id}?error=invalid`);
  const { data, error } = await db.from("customers")
    .update({ name, email: email || null, phone: field("phone", 40) || null, company: field("company", 150) || null, address: field("address", 500) || null })
    .eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) redirect(`/customers/${id}?error=save`);
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}?updated=1`);
}
