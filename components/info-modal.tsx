"use client";

import { fetchApi } from '@/lib/api';
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
  id: number | null;
  tabletype?: "requests" | "inventory";
}

interface Transaction {
  id: number;
  type: string;
  quantity: number;
  date: string;
  remarks: string;
  createdby: string;
  createddate: string;
}

export function InfoModal({ open, onClose, id, tabletype = "requests" }: InfoModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && id) {
      setLoading(true);
      
      // Build query string for GET request
      const queryParams = new URLSearchParams({
        draw: "1",
        start: "0",
        length: "100",
        id: String(id),
        tabletype: tabletype,
        search: "",
      });

      fetchApi(`${API_BASE_URL}/api/transactionstableinfo?${queryParams}`)
        .then((res) => res.json())
        .then((response) => {
          // API returns DataTable format with data in response.data
          const data = response.data || response || [];
          setTransactions(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error("Error fetching transaction info:", err))
        .finally(() => setLoading(false));
    }
  }, [open, id, tabletype]);

  useEffect(() => {
    if (!open) {
      setTransactions([]);
    }
  }, [open]);

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      itemrequested: "Requested",
      itemapproved: "Approved",
      itemissued: "Issued",
      itemrejected: "Rejected",
      itemcancelled: "Cancelled",
      itemreturned: "Returned",
      inventory: "Inventory",
    };
    return labels[type] || type || "Unknown";
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      itemrequested: "bg-secondary text-secondary-foreground",
      itemapproved: "bg-primary text-primary-foreground",
      itemissued: "bg-success text-success-foreground",
      itemrejected: "bg-destructive text-destructive-foreground",
      itemcancelled: "bg-muted text-muted-foreground",
      itemreturned: "bg-warning text-warning-foreground",
      inventory: "bg-accent text-accent-foreground",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Transaction History</DialogTitle>
          <DialogDescription>
            View the complete history of this item&apos;s transactions.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quantity</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Remarks</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">By</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-1 text-xs ${getTypeColor(tx.type)}`}>
                            {getTypeLabel(tx.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground">{tx.quantity}</td>
                        <td className="px-4 py-3 text-foreground">
                          {tx.date ? new Date(tx.date).toLocaleDateString("en-GB") : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tx.remarks || "-"}</td>
                        <td className="px-4 py-3 text-foreground">{tx.createdby || "-"}</td>
                        <td className="px-4 py-3 text-foreground">
                          {tx.createddate ? new Date(tx.createddate).toLocaleDateString("en-GB") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <span className={`rounded px-2 py-1 text-xs ${getTypeColor(tx.type)}`}>
                      {getTypeLabel(tx.type)}
                    </span>
                    <span className="text-sm font-medium text-foreground">Qty: {tx.quantity}</span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Date:</span>{" "}
                      {tx.date ? new Date(tx.date).toLocaleDateString("en-GB") : "-"}
                    </p>
                    {tx.remarks && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Remarks:</span> {tx.remarks}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">By:</span> {tx.createdby || "-"}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Entry:</span>{" "}
                      {tx.createddate ? new Date(tx.createddate).toLocaleDateString("en-GB") : "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
