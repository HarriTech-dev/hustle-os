"use client";

import { type User } from "@supabase/supabase-js";
import { Bell, Search } from "lucide-react";

export function Header({ user }: { user: User }) {
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-6 lg:px-8">
      <div className="flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 hover:bg-accent transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
          {user.email?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
