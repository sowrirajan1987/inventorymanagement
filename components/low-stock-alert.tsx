"use client";

import { fetchApi } from '@/lib/api';
import { useState, useCallback, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, Search, Download, Package, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

interface LowStockAlertItem {
  id: number;
  product: string;
  department: string;
  project?: string;
  balance: number;
  lowstocklevel: number;
  docpath?: string;
}

interface Department {
  ddvalue?: string;
  value?: string;
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
function MobileLowStockAlertCard({ item }: { item: LowStockAlertItem }) {
  const isLowStock = item.balance <= item.lowstocklevel;
  
  return (
    <div className="flex gap-3 p-4 bg-card border border-border rounded-lg">
      {/* Image on left */}
      <div className="flex-shrink-0">
        {item.docpath ? (
          <img
            src={`${API_BASE_URL}/api/image/${item.docpath}`}
            alt={item.product}
            className="w-16 h-16 object-cover rounded-lg border border-border"
          />
        ) : (
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Details on right */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground truncate">{item.product}</h3>
          {isLowStock && (
            <span className="inline-block text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded whitespace-nowrap">
              Low Stock
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{item.department}</p>
        <div className="text-sm space-y-0.5">
          <p>Min Level: {item.lowstocklevel}</p>
          <p className={cn(
            "font-medium",
            isLowStock ? "text-destructive" : "text-foreground"
          )}>
            Current: {item.balance}
          </p>
        </div>
      </div>
    </div>
  );
}

interface LowStockAlertProps {
  onBack: () => void;
}

export function LowStockAlert({ onBack }: LowStockAlertProps) {
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const [rowData, setRowData] = useState<LowStockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Department[]>([]);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [displayedData, setDisplayedData] = useState<LowStockAlertItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch master data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const res = await fetchApi(`${API_BASE_URL}/api/master?id=1`);
        if (!res.ok) throw new Error("Failed to fetch master data");
        const data = await res.json();
        setDepartments(data.departments || []);
        setProjects(data.projects || []);
      } catch (err) {
        console.error("[v0] Error fetching master data:", err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch low stock alert data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const payload = {
          start: 0,
          length: 10000,
          search: { value: searchQuery },
          draw: 1,
          filtereddepartment: departmentFilter,
          project: projectFilter,
        };
        const res = await fetchApi(`${API_BASE_URL}/api/lowstockmaster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to fetch low stock alert data");
        const data = await res.json();
        const items = Array.isArray(data.data) ? data.data : [];
        setRowData(items);
        setCurrentPage(1);
      } catch (err) {
        console.error("[v0] Error fetching low stock alert data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [departmentFilter, projectFilter, searchQuery]);

  // Update displayed data based on pagination
  useEffect(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    setDisplayedData(rowData.slice(start, end));
  }, [rowData, currentPage]);

  const totalRows = rowData.length;
  const totalPages = Math.ceil(totalRows / pageSize);

  const columnDefs: ColDef<LowStockAlertItem>[] = [
    { field: "id", headerName: "ID", hide: true },
    {
      field: "docpath",
      headerName: "Image",
      width: 80,
      sortable: false,
      cellRenderer: (params: any) =>
        params.value ? (
          <img
            src={`${API_BASE_URL}/api/image/${params.value}`}
            alt="Product"
            className="h-8 w-8 object-cover rounded border border-border"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
    },
    { field: "product", headerName: "Product", flex: 1, minWidth: 120 },
    { field: "department", headerName: "Department", flex: 1, minWidth: 120 },
    {
      field: "project",
      headerName: "Project",
      flex: 1,
      minWidth: 100,
      valueFormatter: (params: any) => params.value && params.value !== "Not Applicable" ? params.value : "-",
    },
    { field: "lowstocklevel", headerName: "Min Level", width: 100, cellClass: "text-center" },
    { 
      field: "balance", 
      headerName: "Current Stock", 
      width: 120, 
      cellClass: "text-center",
      cellStyle: (params: any) => {
        return params.data?.balance <= params.data?.lowstocklevel
          ? { color: "#dc2626", fontWeight: "bold" }
          : { color: "#16a34a", fontWeight: "bold" };
      },
    },
  ];

  const exportToExcel = () => {
    const headers = ["Product", "Department", "Project", "Min Level", "Current Stock", "Status"];
    const rows = displayedData.map((item) => [
      item.product,
      item.department,
      item.project || "-",
      item.lowstocklevel,
      item.balance,
      item.balance <= item.lowstocklevel ? "Low Stock" : "Ok",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `low-stock-alert_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Low Stock Alert</h1>
        <p className="text-sm text-muted-foreground">Items below minimum stock levels</p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-40"
            />
          </div>

          {/* Department Filter */}
          <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-40 justify-between px-3"
              >
                <span className="truncate">{departmentFilter || "Department..."}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-0">
              <Command>
                <CommandInput placeholder="Search departments..." />
                <CommandEmpty>No department found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      setDepartmentFilter("");
                      setDepartmentOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", departmentFilter === "" ? "opacity-100" : "opacity-0")}
                    />
                    All Departments
                  </CommandItem>
                  {departments.map((dept: any, idx) => {
                    const deptValue = typeof dept === "string" ? dept : dept.ddvalue || dept.value;
                    if (!deptValue) return null;
                    return (
                      <CommandItem
                        key={idx}
                        value={deptValue}
                        onSelect={() => {
                          setDepartmentFilter(deptValue);
                          setDepartmentOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            departmentFilter === deptValue ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {deptValue}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Project Filter */}
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-40 justify-between px-3"
              >
                <span className="truncate">{projectFilter || "Project..."}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-0">
              <Command>
                <CommandInput placeholder="Search projects..." />
                <CommandEmpty>No project found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      setProjectFilter("");
                      setProjectOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", projectFilter === "" ? "opacity-100" : "opacity-0")}
                    />
                    All Projects
                  </CommandItem>
                  {projects.map((proj: any, idx) => {
                    const projValue = typeof proj === "string" ? proj : proj.ddvalue || proj.value;
                    if (!projValue || projValue === "Not Applicable") return null;
                    return (
                      <CommandItem
                        key={idx}
                        value={projValue}
                        onSelect={() => {
                          setProjectFilter(projValue);
                          setProjectOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            projectFilter === projValue ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {projValue}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Export Button */}
        <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
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
                gridApiRef.current = event.api;
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : displayedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No low stock items found</div>
        ) : (
          displayedData.map((item, idx) => (
            <MobileLowStockAlertCard key={`alert-${item.id}-${idx}`} item={item} />
          ))
        )}
      </div>

      {/* Footer with record count and pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground mt-4">
        <span>
          Showing {totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, totalRows)} of {totalRows} entries
        </span>
        {totalPages > 1 && (
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
        )}
      </div>
    </div>
  );
}
