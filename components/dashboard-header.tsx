"use client";

import { Package } from "lucide-react";
import Link from "next/link";

export function DashboardHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Inventory Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time inventory tracking
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-2 w-2 animate-pulse rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>
    </header>
  );
}
