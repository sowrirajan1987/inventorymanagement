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
import { DropdownModal } from "@/components/dropdown-modal";
import { Plus, Pencil, Trash2, Search, Download, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const CHUNK_SIZE = 20;

interface DropdownRow {
  id: number;
  ddtype: string;
  ddvalue: string;
  createdby: string;
  createddate: string;
}

interface ApiResponse {
  data: DropdownRow[];
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
function MobileDropdownCard({
  item,
  onEdit,
  onDelete,
}: {
  item: DropdownRow;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">
              {item.ddtype}
            </span>
          </div>
          <p className="font-semibold text-foreground mt-2">{item.ddvalue}</p>
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
    </div>
  );
}

export function DropdownTable() {
  const [rowData, setRowData] = useState<DropdownRow[]>([]);
  const [displayedData, setDisplayedData] = useState<DropdownRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedChunks, setLoadedChunks] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<DropdownRow | null>(null);
  const gridRef = useRef<GridApi | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
      setLoadedChunks(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch dropdown data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const actualPageSize = pageSize === -1 ? 10000 : pageSize;
      const res = await fetchApi(`${API_BASE_URL}/api/dropdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: (currentPage - 1) * actualPageSize,
          length: actualPageSize,
          search: { value: debouncedSearch },
          draw: 1,
        }),
      });
      const data = await res.json();
      setRowData(data.data || []);
      setTotalRows(data.recordsFiltered || 0);

      if (pageSize > 10 || pageSize === -1) {
        const initialChunk = (data.data || []).slice(0, CHUNK_SIZE);
        setDisplayedData(initialChunk);
        setLoadedChunks(1);
      } else {
        setDisplayedData(data.data || []);
      }
      setTotalPages(Math.ceil((data.recordsFiltered || 0) / actualPageSize));
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columnDefs: ColDef<DropdownRow>[] = [
    { field: "id", headerName: "ID", hide: true },
    { field: "ddtype", headerName: "Type", flex: 1, minWidth: 120 },
    { field: "ddvalue", headerName: "Value", flex: 1, minWidth: 150 },
    { field: "createdby", headerName: "Created By", flex: 1, minWidth: 120 },
    {
      field: "createddate",
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
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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

  const exportToCSV = () => {
    const headers = ["Type", "Value", "Created By", "Date"];
    const rows = displayedData.map((row) => [
      row.ddtype,
      row.ddvalue,
      row.createdby,
      new Date(row.createddate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dropdowns.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dropdowns</h2>
        <p className="text-sm text-muted-foreground">Manage dropdown values for your application</p>
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
            Add Dropdown
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
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
          <div className="text-center py-8 text-muted-foreground">No dropdowns found</div>
        ) : (
          displayedData.map((item) => (
            <MobileDropdownCard
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
      <DropdownModal
        key={`add-${showAddModal}`}
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        formType="Add"
        dropdownId={null}
        onSuccess={() => {
          setCurrentPage(1);
          setLoadedChunks(1);
          fetchData();
        }}
      />

      <DropdownModal
        key={`edit-${showEditModal}-${selectedId}`}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedId(null);
          setSelectedRow(null);
        }}
        formType="Edit"
        dropdownId={selectedId}
        initialData={selectedRow}
        onSuccess={() => {
          setCurrentPage(1);
          setLoadedChunks(1);
          fetchData();
        }}
      />

      <DropdownModal
        key={`delete-${showDeleteModal}-${selectedId}`}
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedId(null);
          setSelectedRow(null);
        }}
        formType="Delete"
        dropdownId={selectedId}
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
