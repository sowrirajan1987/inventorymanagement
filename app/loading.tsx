"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    </div>
  );
}
