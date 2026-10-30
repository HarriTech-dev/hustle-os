import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Package } from "lucide-react";

export default async function InventoryPage() {
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

  const { data: inventory } = await supabase
    .from("inventory")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={user} businessName={business?.business_name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground mt-1">Track your products and stock levels</p>
          </div>
        </div>
        {inventory && inventory.length > 0 ? (
          <div className="rounded-lg border">
            <div className="grid grid-cols-6 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
              <div>Name</div>
              <div>SKU</div>
              <div>Quantity</div>
              <div>Unit Price</div>
              <div>Category</div>
              <div>Status</div>
            </div>
            {inventory.map((item: any) => (
              <div key={item.id} className="grid grid-cols-6 gap-4 p-4 text-sm border-b last:border-0">
                <div>{item.name}</div>
                <div>{item.sku || "—"}</div>
                <div>{item.quantity}</div>
                <div>{item.currency} {item.unit_price}</div>
                <div>{item.category || "—"}</div>
                <div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    item.quantity <= item.low_stock_threshold
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {item.quantity <= item.low_stock_threshold ? "Low Stock" : "In Stock"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No inventory yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add your first product to track stock</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
