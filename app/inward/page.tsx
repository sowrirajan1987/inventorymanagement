"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { InwardTable } from "@/components/inward-table";

export default function InwardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
        <InwardTable />
      </main>
    </div>
  );
}
