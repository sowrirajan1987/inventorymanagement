"use client";

import { StatCard } from "@/components/stat-card";
import {
  FolderOpen,
  Package,
  ArrowUpFromLine,
  AlertTriangle,
} from "lucide-react";
import useSWR from "swr";
import { API_ENDPOINTS } from "@/lib/config";

import { fetchApi } from "@/lib/api";

interface HomeData {
  categoriesCount: number;
  totalItems: number;
  requestItems: number;
  lowStockCount: number;
  userType?: string;
}

const fetcher = (url: string) => fetchApi(url).then((res) => res.json());

export function InventoryOverview() {
  const { data, error, isLoading } = useSWR<HomeData>(
    API_ENDPOINTS.home,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  const stats = [
    ...(data?.userType === "Admin" ? [{
      title: "Master Catalogue",
      value: data?.categoriesCount ?? 0,
      description: "Total categories in your inventory system",
      icon: FolderOpen,
      variant: "primary" as const,
      href: "/categories",
    }] : []),
    {
      title: "Inward Items",
      value: data?.totalItems ?? 0,
      description: "Total balance of items received in inventory",
      icon: Package,
      variant: "success" as const,
      href: "/inward",
    },
    {
      title: "Outward Requests",
      value: data?.requestItems ?? 0,
      description: "Total transactions processed for item requests",
      icon: ArrowUpFromLine,
      variant: "accent" as const,
      href: "/outward",
    },
    {
      title: "Low Stock Alert",
      value: data?.lowStockCount ?? 0,
      description: "Items below minimum stock level",
      icon: AlertTriangle,
      variant: "warning" as const,
      href: "/low-stock-alert",
    },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold text-foreground">
          Unable to fetch data
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Please check your connection and try again
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Quick Overview
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time snapshot of your inventory status
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
}
