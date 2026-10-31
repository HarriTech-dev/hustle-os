
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Package } from "lucide-react";
import { addInventoryItem } from "./actions";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
  }>;
}) {
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

  const { data: inventory } = await supabase
    .from("inventory")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const formatPrice = (
    amount: number,
    currency: string
  ) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <DashboardLayout
      user={user}
      businessName={business?.business_name}
    >
      <div className="min-w-0 space-y-6">
        {/* Page heading */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inventory
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your products and stock levels
          </p>
        </div>

        {/* Feedback messages */}
        {params.created === "1" && (
          <p role="status" className="text-green-700">
            Product saved successfully.
          </p>
        )}

        {params.error && (
          <p role="alert" className="text-red-700">
            {params.error === "invalid"
              ? "Check product name, quantity, price and low-stock threshold."
              : "Unable to save product. Please check your account permissions and try again."}
          </p>
        )}

        {/* Add product form */}
        <details className="rounded-xl border bg-card p-4 sm:p-5">
          <summary className="cursor-pointer font-semibold">
            Add a product
          </summary>

          <form
            action={addInventoryItem}
            className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <label className="grid min-w-0 gap-1 text-sm">
              Product name *
              <input
                name="name"
                required
                maxLength={200}
                className="w-full min-w-0 rounded border bg-background p-2"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm">
              SKU
              <input
                name="sku"
                maxLength={100}
                className="w-full min-w-0 rounded border bg-background p-2"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm">
              Category
              <input
                name="category"
                maxLength={100}
                className="w-full min-w-0 rounded border bg-background p-2"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm">
              Quantity *
              <input
                name="quantity"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                required
                className="w-full min-w-0 rounded border bg-background p-2"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm">
              Unit price (NGN) *
              <input
                name="unit_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                required
                className="w-full min-w-0 rounded border bg-background p-2"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm">
              Low-stock threshold *
              <input
                name="low_stock_threshold"
                type="number"
                min="0"
                step="1"
                defaultValue="10"
                required
                className="w-full min-w-0 rounded border bg-background p-2"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm sm:col-span-2">
              Description
              <textarea
                name="description"
                maxLength={2000}
                rows={3}
                className="w-full min-w-0 rounded border bg-background p-2"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-foreground px-5 py-3 font-medium text-background sm:col-span-2"
            >
              Save product
            </button>
          </form>
        </details>

        {/* Inventory display */}
        {inventory && inventory.length > 0 ? (
          <>
            {/* Mobile: product cards */}
            <div className="grid gap-4 md:hidden">
              {inventory.map((item) => {
                const lowStock =
                  item.quantity <= item.low_stock_threshold;

                return (
                  <div
                    key={item.id}
                    className="min-w-0 rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-semibold leading-snug">
                          {item.name}
                        </h3>

                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          {item.category || "Uncategorized"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          lowStock
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {lowStock ? "Low Stock" : "In Stock"}
                      </span>
                    </div>

                    <div className="my-4 border-t" />

                    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          SKU
                        </p>
                        <p className="mt-1 break-words text-sm font-medium">
                          {item.sku || "—"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Quantity
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {item.quantity}
                        </p>
                      </div>

                      <div className="col-span-2 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Unit Price
                        </p>
                        <p className="mt-1 break-words text-base font-semibold">
                          {formatPrice(
                            Number(item.unit_price),
                            item.currency || "NGN"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet/Desktop: responsive table */}
            <div className="hidden min-w-0 overflow-hidden rounded-xl border bg-card md:block">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[850px] table-auto text-left text-sm">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-4 font-medium">
                        Name
                      </th>
                      <th className="px-4 py-4 font-medium">
                        SKU
                      </th>
                      <th className="px-4 py-4 font-medium">
                        Quantity
                      </th>
                      <th className="px-4 py-4 font-medium">
                        Unit Price
                      </th>
                      <th className="px-4 py-4 font-medium">
                        Category
                      </th>
                      <th className="px-4 py-4 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventory.map((item) => {
                      const lowStock =
                        item.quantity <=
                        item.low_stock_threshold;

                      return (
                        <tr
                          key={item.id}
                          className="border-b last:border-0"
                        >
                          <td className="max-w-[220px] break-words px-4 py-4 font-medium">
                            {item.name}
                          </td>

                          <td className="max-w-[140px] break-words px-4 py-4">
                            {item.sku || "—"}
                          </td>

                          <td className="px-4 py-4">
                            {item.quantity}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            {formatPrice(
                              Number(item.unit_price),
                              item.currency || "NGN"
                            )}
                          </td>

                          <td className="max-w-[180px] break-words px-4 py-4">
                            {item.category || "—"}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                                lowStock
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {lowStock
                                ? "Low Stock"
                                : "In Stock"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border bg-card p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>

            <h3 className="text-lg font-semibold">
              No inventory yet
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Add your first product to track stock
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
