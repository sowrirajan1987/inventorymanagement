"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { CategoriesTable } from "@/components/categories-table";

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 pt-24">
        <CategoriesTable />
      </main>
    </div>
  );
}
