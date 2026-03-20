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
import { UsersModal } from "@/components/users-modal";
import { Plus, Pencil, Search, Download, Loader2, User } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const CHUNK_SIZE = 20;

interface UserRow {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  userstatus: string;
  createdby: string;
  createddate: string;
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
function MobileUserCard({
  item,
  onEdit,
  onDelete,
}: {
  item: UserRow;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-3">
      {/* Header with avatar and actions */}
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/50 rounded-lg flex items-center justify-center">
            <User className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
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
        </div>
      </div>

      {/* Details in single column */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Email: </span>
          <span className="text-foreground font-medium break-all">{item.email || "-"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Role: </span>
          <span className="text-foreground font-medium">{item.role || "-"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Department: </span>
          <span className="text-foreground font-medium">{item.department || "-"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Status: </span>
          <span className={cn("text-foreground font-medium", 
            item.userstatus === "Active" ? "text-green-600" : "text-yellow-600"
          )}>
            {item.userstatus || "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function UsersTable() {
  const [loading, setLoading] = useState(true);
  const [rowData, setRowData] = useState<UserRow[]>([]);
  const [displayedData, setDisplayedData] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedChunks, setLoadedChunks] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const gridRef = useRef<GridApi | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<UserRow | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const actualPageSize = pageSize === -1 ? 10000 : pageSize;
      console.log("[v0] Fetching users from:", `${API_BASE_URL}/api/userdata`);
      const res = await fetchApi(`${API_BASE_URL}/api/userdata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: (currentPage - 1) * actualPageSize,
          length: actualPageSize,
          search: { value: debouncedSearch },
          draw: 1,
        }),
      });

      console.log("[v0] Users response status:", res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      console.log("[v0] Users data received:", data);

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
      console.error("[v0] Error fetching users data:", err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(totalRows / (pageSize === -1 ? 1 : pageSize));

  const columnDefs: ColDef<UserRow>[] = [
    { field: "id", headerName: "ID", hide: true },
    { field: "name", headerName: "Name", flex: 1, minWidth: 120 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 150 },
    { field: "department", headerName: "Department", flex: 1, minWidth: 120 },
    { field: "role", headerName: "Role", flex: 1, minWidth: 120 },
    {
      field: "userstatus",
      headerName: "Status",
      flex: 1,
      minWidth: 100,
      valueGetter: (params: any) => params.data?.userstatus || params.data?.user_status || "-",
      cellStyle: (params: any) => {
        const value = params.data?.userstatus || params.data?.user_status;
        return value === "Active"
          ? { color: "#16a34a", fontWeight: "bold" }
          : { color: "#d97706", fontWeight: "bold" };
      },
    },
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
      width: 80,
      sortable: false,
      cellRenderer: (params: any) => {
        const row = params.data;
        return (
          <div className="flex items-center gap-2 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => {
                setSelectedId(row.id);
                setSelectedRow(row);
                setShowEditModal(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const exportToCSV = () => {
    const csv = [
      ["ID", "Name", "Email", "Department", "Role", "Created By", "Date"],
      ...rowData.map((row) => [
        row.id,
        row.name,
        row.email,
        row.department,
        row.role,
        row.createdby,
        new Date(row.createddate).toLocaleDateString("en-GB"),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Users</h2>
        <p className="text-sm text-muted-foreground">Manage user accounts and permissions</p>
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
            Add User
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
          <div className="text-center py-8 text-muted-foreground">No users found</div>
        ) : (
          displayedData.map((item) => (
            <MobileUserCard
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
      <UsersModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        formType="Add"
        userId={null}
        onSuccess={() => {
          setCurrentPage(1);
          setLoadedChunks(1);
          fetchData();
        }}
      />

      <UsersModal
        key={`edit-${showEditModal}-${selectedId}`}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedId(null);
          setSelectedRow(null);
        }}
        formType="Edit"
        userId={selectedId}
        initialData={selectedRow}
        onSuccess={() => {
          setCurrentPage(1);
          setLoadedChunks(1);
          fetchData();
        }}
      />

      <UsersModal
        key={`delete-${showDeleteModal}-${selectedId}`}
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedId(null);
          setSelectedRow(null);
        }}
        formType="Delete"
        userId={selectedId}
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
