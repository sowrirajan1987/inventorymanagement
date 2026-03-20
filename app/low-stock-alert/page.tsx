"use client";

import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { LowStockAlert } from "@/components/low-stock-alert";

export default function LowStockAlertPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
        <LowStockAlert onBack={() => router.push("/")} />
      </main>
    </div>
  );
}
