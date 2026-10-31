"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const str = (key: string, max = 200) => String(formData.get(key) ?? "").trim().slice(0, max);
  const name = str("name");
  const quantityText = str("quantity", 20);
  const priceText = str("unit_price", 20);
  const thresholdText = str("low_stock_threshold", 20);
  const quantity = Number(quantityText);
  const unitPrice = Number(priceText);
  const threshold = Number(thresholdText);
  if (!name || !Number.isSafeInteger(quantity) || quantity < 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 9999999999 || !Number.isSafeInteger(threshold) || threshold < 0 || quantityText === "" || priceText === "" || thresholdText === "") {
    redirect("/inventory?error=invalid");
  }
  const { error } = await supabase.from("inventory").insert({
    user_id: user.id,
    name,
    description: str("description", 2000) || null,
    sku: str("sku", 100) || null,
    category: str("category", 100) || null,
    quantity,
    unit_price: unitPrice,
    low_stock_threshold: threshold,
    currency: "NGN",
  });
  if (error) redirect("/inventory?error=save");
  revalidatePath("/inventory");
  revalidatePath("/marketplace");
  revalidatePath("/notifications");
  redirect("/inventory?created=1");
}
