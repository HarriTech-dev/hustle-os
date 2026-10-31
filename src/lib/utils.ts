import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "NGN"
): string {
  const symbols: Record<string, string> = {
    NGN: "\u20A6",
    GHS: "\u20B5",
    KES: "KSh",
    ZAR: "R",
    UGX: "USh",
    TZS: "TSh",
    USD: "$",
    EUR: "\u20AC",
  };

  return `${symbols[currency] ?? currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
