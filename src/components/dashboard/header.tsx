"use client";

import { type User } from "@supabase/supabase-js";
import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Header({ user }: { user: User }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-6 lg:px-8">
      <div className="flex-1">
        <form className="relative max-w-md" onSubmit={(e) => { e.preventDefault(); if(query.trim()) router.push(`/inventory?q=${encodeURIComponent(query.trim())}`); }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/notifications" aria-label="View notifications" className="relative rounded-lg p-2 hover:bg-accent transition-colors">
          <Bell className="h-5 w-5" />

        </Link>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
          {user.email?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
