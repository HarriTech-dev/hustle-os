"use client";

import { type User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export function DashboardLayout({
  children,
  user,
  businessName,
}: {
  children: React.ReactNode;
  user: User;
  businessName?: string;
}) {
  return (
    <div className="flex h-screen w-full">
      <Sidebar user={user} businessName={businessName} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
