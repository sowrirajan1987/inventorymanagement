"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "primary" | "warning" | "success" | "accent";
  isLoading?: boolean;
  href?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
  isLoading = false,
  href,
}: StatCardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    primary: "bg-card border-primary/30",
    warning: "bg-card border-warning/30",
    success: "bg-card border-success/30",
    accent: "bg-card border-accent/30",
  };

  const iconStyles = {
    default: "bg-secondary text-foreground",
    primary: "bg-primary/15 text-primary",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    accent: "bg-accent/15 text-accent",
  };

  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (href) {
      return (
        <Link href={href} className="block h-full">
          {children}
        </Link>
      );
    }
    return <div className="h-full">{children}</div>;
  };

  return (
    <CardWrapper>
      <Card
        className={cn(
          "relative overflow-hidden border transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 h-full",
          variantStyles[variant],
          href && "cursor-pointer"
        )}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {isLoading ? (
                <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
              ) : (
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                iconStyles[variant]
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}
