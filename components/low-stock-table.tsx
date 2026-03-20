"use client";

import { fetchApi } from '@/lib/api';
import { useState, useCallback, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LowStockModal } from "@/components/low-stock-modal";
import { Plus, Pencil, Trash2, Search, Download, Loader2, Package } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const CHUNK_SIZE = 20;

interface LowStockRow {
  id: number;
  product: string;
  department: string;
  project: string;
  unit: string;
  lowstocklevel: number;
  modifiedby: string;
  modifieddate: string;
  docpath?: string;
}

interface ApiResponse {
  data: LowStockRow[];
  recordsTotal: number;
  recordsFiltered: number;
}

const myTheme = themeQuartz.withParams({
  backgroundColor: "var(--background)",
  foregroundColor: "var(--foreground)",
  borderColor: "var(--border)",
  headerBackgroundColor: "var(--muted)",
  headerTextColor: "var(--foreground)",
  oddRowBackgroundColor: "var(--background)",
  rowHoverColor: "var(--muted)",
});

// Mobile Card Component
function MobileLowStockCard({
  item,
  onEdit,
  onDelete,
}: {
  item: LowStockRow;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex gap-4 p-4 bg-card border border-border rounded-lg">
      {/* Image on the left */}
      <div className="flex-shrink-0">
        {item.docpath ? (
          <img
            src={`${API_BASE_URL}/api/image/${item.docpath}`}
            alt={item.product}
            className="w-20 h-20 object-cover rounded-lg border border-border"
          />
        ) : (
          <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Details on the right */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{item.product}</h3>
            <p className="text-sm text-muted-foreground truncate">{item.department}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => onEdit(item.id)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Project: </span>
            <span className="text-foreground font-medium">{item.project || "-"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Unit: </span>
            <span className="text-foreground font-medium">{item.unit || "-"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Low Stock: </span>
            <span className="text-foreground font-medium">{item.lowstocklevel || "-"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">By: </span>
            <span className="text-foreground">{item.modifiedby || "-"}</span>
            <span className="text-muted-foreground"> on </span>
            <span className="text-foreground">
              {item.modifieddate
                ? new Date(item.modifieddate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
                : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LowStockTable() {
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const [rowData, setRowData] = useState<LowStockRow[]>([]);
  const [displayedData, setDisplayedData] = useState<LowStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<LowStockRow | null>(null);
  const [loadedChunks, setLoadedChunks] = useState(1);

  const CHUNK_SIZE = 50;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch low stock data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const actualPageSize = pageSize === -1 ? 10000 : pageSize;
      console.log("[v0] Fetching low stock data from:", `${API_BASE_URL}/api/lowstockmaster`, { pageSize: actualPageSize, search: debouncedSearch });
      const res = await fetchApi(`${API_BASE_URL}/api/lowstockmaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: (currentPage - 1) * actualPageSize,
          length: actualPageSize,
          search: { value: debouncedSearch },
          draw: 1,
        }),
      });

      console.log("[v0] Low stock table response status:", res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      console.log("[v0] Low stock table data received:", data);

      setRowData(data.data || []);
      setTotalRows(data.recordsFiltered || 0);

      if (pageSize > 10 || pageSize === -1) {
        const initialChunk = (data.data || []).slice(0, CHUNK_SIZE);
        setDisplayedData(initialChunk);
        setLoadedChunks(1);
      } else {
        setDisplayedData(data.data || []);
      }
    } catch (err) {
      console.error("[v0] Error fetching low stock data:", err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reloadTable = useCallback(() => {
    setCurrentPage(1);
    setLoadedChunks(1);
  }, []);

  const totalPages = Math.ceil(totalRows / (pageSize === -1 ? totalRows : pageSize));

  // Column definitions
  const columnDefs: ColDef<LowStockRow>[] = [
    { field: "id", headerName: "ID", hide: true },
    {
      headerName: "Image",
      width: 80,
      sortable: false,
      cellRenderer: (params: any) => {
        const row = params.data;
        return row.docpath ? (
          <img
            src={`${API_BASE_URL}/api/image/${row.docpath}`}
            alt={row.product}
            className="w-12 h-12 object-cover rounded border border-border"
          />
        ) : (
          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        );
      },
    },
    { field: "product", headerName: "Product", flex: 1, minWidth: 120 },
    { field: "department", headerName: "Department", flex: 1, minWidth: 120 },
    { field: "project", headerName: "Project", flex: 1, minWidth: 120 },
    { field: "unit", headerName: "Unit", flex: 1, minWidth: 80 },
    { field: "lowstocklevel", headerName: "Low Stock Level", flex: 1, minWidth: 120 },
    { field: "modifiedby", headerName: "Created By", flex: 1, minWidth: 120 },
    {
      field: "modifieddate",
      headerName: "Date",
      flex: 1,
      minWidth: 120,
      valueFormatter: (params: any) => {
        if (!params.value) return "-";
        return new Date(params.value).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
    },
    {
      headerName: "Actions",
      width: 100,
      sortable: false,
      cellRenderer: (params: any) => {
        const row = params.data;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setSelectedId(row.id);
                setSelectedRow(row);
                setShowEditModal(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                setSelectedId(row.id);
                setSelectedRow(row);
                setShowDeleteModal(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  const exportToCSV = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`${API_BASE_URL}/api/lowstockmaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: 0,
          length: 10000,
          search: { value: debouncedSearch },
          draw: 1,
        }),
      });
      const data = await res.json();
      const rows = data.data || [];

      if (rows.length === 0) {
        alert("No data to export");
        return;
      }

      const headers = ["Product", "Department", "Project", "Unit", "Low Stock Level", "Created By", "Date"];
      const csvContent = [
        headers.join(","),
        ...rows.map((row: LowStockRow) =>
          [
            row.product,
            row.department,
            row.project,
            row.unit,
            row.lowstocklevel,
            row.modifiedby,
            row.modifieddate,
          ]
            .map((v) => `"${v}"`)
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "low-stock-master.csv");
      link.click();
    } catch (err) {
      console.error("Error exporting data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && rowData.length === 0 && !debouncedSearch && !departmentFilter && !projectFilter) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Low Stock Master</h2>
          <p className="text-sm text-muted-foreground">Configure low stock threshold levels for inventory items</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No low stock items configured</p>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Low Stock
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Low Stock Master</h2>
        <p className="text-sm text-muted-foreground">Configure low stock threshold levels for inventory items</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); setLoadedChunks(1); }}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="-1">All</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background text-foreground"
            />
          </div>

          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Low Stock
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        {loading && pageSize === 10 ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="ag-theme-quartz w-full" style={{ height: "600px" }}>
            <AgGridReact
              ref={gridRef}
              rowData={displayedData}
              columnDefs={columnDefs}
              theme={myTheme}
              suppressPaginationPanel={true}
              onGridReady={(event: GridReadyEvent) => {
                gridRef.current = event.api;
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : displayedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No low stock items found</div>
        ) : (
          displayedData.map((item) => (
            <MobileLowStockCard
              key={item.id}
              item={item}
              onEdit={(id) => {
                setSelectedId(id);
                setSelectedRow(item);
                setShowEditModal(true);
              }}
              onDelete={(id) => {
                setSelectedId(id);
                setSelectedRow(item);
                setShowDeleteModal(true);
              }}
            />
          ))
        )}
      </div>

      {/* Footer with record count and pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground mt-4">
        <span>
          Showing {totalRows === 0 ? 0 : (currentPage - 1) * (pageSize === -1 ? totalRows : pageSize) + 1} to{" "}
          {Math.min(currentPage * (pageSize === -1 ? totalRows : pageSize), totalRows)} of {totalRows} entries
        </span>
        {pageSize === 10 && totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-foreground font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        ) : (
          (pageSize > 10 || pageSize === -1) && !loading && displayedData.length < totalRows && (
            <span className="text-xs">Scroll down to load more</span>
          )
        )}
      </div>

      {/* Modals */}
      <LowStockModal
        key={`add-${showAddModal}`}
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        formType="Add"
        lowStockId={null}
        onSuccess={() => {
          setCurrentPage(1);
          setLoadedChunks(1);
          fetchData();
        }}
      />

      <LowStockModal
        key={`edit-${showEditModal}-${selectedId}`}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedId(null);
          setSelectedRow(null);
        }}
        formType="Edit"
        lowStockId={selectedId}
        initialData={selectedRow}
        onSuccess={() => {
          setCurrentPage(1);
          setLoadedChunks(1);
          fetchData();
        }}
      />

      <LowStockModal
        key={`delete-${showDeleteModal}-${selectedId}`}
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedId(null);
          setSelectedRow(null);
        }}
        formType="Delete"
        lowStockId={selectedId}
        initialData={selectedRow}
        onSuccess={() => {
          setCurrentPage(1);
          setLoadedChunks(1);
          fetchData();
        }}
      />
    </div>
  );
}
