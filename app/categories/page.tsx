"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { CategoriesTable } from "@/components/categories-table";
import { LowStockTable } from "@/components/low-stock-table";
import { DropdownTable } from "@/components/dropdown-table";
import { UsersTable } from "@/components/users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("catalogue");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "low-stock") {
      setActiveTab("lowstock");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 pt-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
            <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
            <TabsTrigger value="dropdown">Dropdown</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          
          <TabsContent value="catalogue" className="mt-6">
            <CategoriesTable />
          </TabsContent>
          
          <TabsContent value="lowstock" className="mt-6">
            <LowStockTable />
          </TabsContent>

          <TabsContent value="dropdown" className="mt-6">
            <DropdownTable />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UsersTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
