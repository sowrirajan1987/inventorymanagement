"use client";

import { fetchApi } from '@/lib/api';
import { useState, useCallback, useRef, useEffect } from "react";
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
import { OutwardModal } from "@/components/outward-modal";
import { InventoryModal } from "@/components/inventory-modal";
import { InfoModal } from "@/components/info-modal";
import { ImageModal } from "@/components/image-modal";
import { DashboardTable } from "@/components/dashboard-table";
import { Plus, Undo2, Info, Search, Download, Package, Loader2, Check, X, ChevronsUpDown, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const CHUNK_SIZE = 20;

interface OutwardItem {
  id: number;
  category: string;
  product: string;
  docpath: string;
  department: string;
  quantity: number;
  date: string;
  createdby: string;
  createddate: string;
  type: string;
  project?: string;
  rented?: string;
  categoryid?: number;
}

interface Department {
  ddvalue?: string;
  value?: string;
}

interface Project {
  ddvalue?: string;
  value?: string;
}

export function InwardTable() {
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const [rowData, setRowData] = useState<OutwardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [userType, setUserType] = useState<string>("");

  // Infinite scroll state
  const [displayedData, setDisplayedData] = useState<OutwardItem[]>([]);
  const [loadedChunks, setLoadedChunks] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
      setLoadedChunks(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch departments and projects
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const res = await fetchApi(`${API_BASE_URL}/api/master?id=1`);
        const data = await res.json();
        
        // Fetch departments
        const deptList = data.departmentList || data.departments || [];
        const departmentsArray = Array.isArray(deptList[0]) ? deptList[0] : deptList;
        setDepartments(departmentsArray);
        
        // Fetch projects
        const projList = data.project || data.projects || [];
        const projectsArray = Array.isArray(projList[0]) ? projList[0] : projList;
        setProjects(projectsArray);
        
        // Fetch userType
        if (data.userType) {
          setUserType(data.userType);
        }
      } catch (err) {
        console.error("Error fetching master data:", err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const actualPageSize = pageSize === -1 ? 10000 : pageSize;
      const res = await fetchApi(`${API_BASE_URL}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tabletype: "inventory",
          filtereddepartment: departmentFilter,
          filteredProject: projectFilter,
          userid: 1,
          start: (currentPage - 1) * actualPageSize,
          length: actualPageSize,
          search: { value: debouncedSearch },
          draw: 1,
        }),
      });
      const data = await res.json();
      setRowData(data.data || []);
      setTotalRows(data.recordsFiltered || 0);

      // Reset infinite scroll for larger page sizes
      if (pageSize > 10 || pageSize === -1) {
        const initialChunk = (data.data || []).slice(0, CHUNK_SIZE);
        setDisplayedData(initialChunk);
        setLoadedChunks(1);
      } else {
        setDisplayedData(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching outward data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, departmentFilter, projectFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load more data for infinite scroll
  const loadMoreData = useCallback(() => {
    if (isLoadingMore || pageSize === 10) return;
    const nextChunk = loadedChunks + 1;
    const endIndex = nextChunk * CHUNK_SIZE;
    if (endIndex <= rowData.length + CHUNK_SIZE) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setDisplayedData(rowData.slice(0, endIndex));
        setLoadedChunks(nextChunk);
        setIsLoadingMore(false);
      }, 200);
    }
  }, [isLoadingMore, loadedChunks, rowData, pageSize]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (pageSize === 10) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedData.length < rowData.length) {
          loadMoreData();
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loadMoreData, displayedData.length, rowData.length, pageSize]);

  // AG Grid scroll handler
  const handleBodyScroll = useCallback(() => {
    if (pageSize === 10 || !gridApiRef.current) return;
    const gridBody = document.querySelector(".ag-body-viewport");
    if (gridBody) {
      const { scrollTop, scrollHeight, clientHeight } = gridBody;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMoreData();
      }
    }
  }, [loadMoreData, pageSize]);

  useEffect(() => {
    const gridBody = document.querySelector(".ag-body-viewport");
    if (gridBody && pageSize !== 10) {
      gridBody.addEventListener("scroll", handleBodyScroll);
      return () => gridBody.removeEventListener("scroll", handleBodyScroll);
    }
  }, [handleBodyScroll, pageSize]);

  const reloadTable = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const onGridReady = (params: GridReadyEvent) => {
    gridApiRef.current = params.api;
  };

  // Export to CSV
  const exportToCSV = async () => {
    try {
      const res = await fetchApi(`${API_BASE_URL}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tabletype: "inventory",
          filtereddepartment: departmentFilter,
          filteredProject: projectFilter,
          userid: 1,
          start: 0,
          length: 10000,
          search: { value: debouncedSearch },
          draw: 1,
        }),
      });
      const data = await res.json();
      const items = data.data || [];

      const headers = ["Product", "Category", "Department", "Quantity", "Date", "Status", "Created By", "Created Date"];
      const csvContent = [
        headers.join(","),
        ...items.map((item: OutwardItem) =>
          [
            `"${item.product || ""}"`,
            `"${item.category || ""}"`,
            `"${item.department || ""}"`,
            item.quantity || 0,
            item.date ? new Date(item.date).toLocaleDateString("en-GB") : "",
            `"${getStatusLabel(item.type)}"`,
            `"${item.createdby || ""}"`,
            item.createddate ? new Date(item.createddate).toLocaleDateString("en-GB") : "",
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dept = departmentFilter || "All";
      link.download = `outward_requests_${dept}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const getStatusLabel = (type: string): string => {
    const statusMap: Record<string, string> = {
      itemissued: "Issued",
      itemrequested: "Requested",
      itemrejected: "Rejected",
      itemapproved: "Approved",
      inventory: "Inventory",
      itemcancelled: "Cancelled",
      itemreturned: "Returned",
    };
    return statusMap[type] || type || "Unknown";
  };

  const getStatusColor = (type: string, quantity: number): string => {
    if (type === "itemissued" && quantity === 0) return "bg-destructive text-destructive-foreground";
    const colors: Record<string, string> = {
      itemissued: "bg-success text-success-foreground",
      itemrequested: "bg-secondary text-secondary-foreground",
      itemrejected: "bg-destructive text-destructive-foreground",
      itemapproved: "bg-primary text-primary-foreground",
      inventory: "bg-warning text-warning-foreground",
      itemcancelled: "bg-muted text-muted-foreground",
      itemreturned: "bg-destructive text-destructive-foreground",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const totalPages = Math.ceil(totalRows / (pageSize === -1 ? totalRows || 1 : pageSize));

  const columnDefs: ColDef<OutwardItem>[] = [
    {
      field: "product",
      headerName: "Product",
      flex: 2,
      minWidth: 150,
      cellRenderer: (params: { data: OutwardItem }) => {
        const row = params.data;
        return (
          <div className="flex items-center gap-2">
            <span>{row.product}</span>
            {row.project && row.project !== "Not Applicable" && (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">{row.project}</span>
            )}
            {row.rented === "Lended" && row.quantity > 0 && (
              <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-xs text-destructive">Lended</span>
            )}
          </div>
        );
      },
    },
    {
      field: "docpath",
      headerName: "Image",
      width: 80,
      cellRenderer: (params: { value: string }) =>
        params.value ? (
          <img
            src={`${API_BASE_URL}/api/image/${params.value}`}
            alt="Product"
            className="h-8 w-8 cursor-pointer rounded object-cover"
            onClick={() => {
              setImageUrl(`${API_BASE_URL}/api/image/${params.value}`);
              setShowImageModal(true);
            }}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
    },
    { field: "department", headerName: "Department", flex: 1, minWidth: 120 },
    { field: "quantity", headerName: "Qty", width: 80, cellClass: "text-center" },
    {
      field: "date",
      headerName: "Date",
      width: 100,
      valueFormatter: (params: { value: string }) =>
        params.value ? new Date(params.value).toLocaleDateString("en-GB") : "",
    },
    {
      field: "type",
      headerName: "Status",
      width: 100,
      cellRenderer: (params: { data: OutwardItem }) => {
        const label = params.data.type === "itemissued" && params.data.quantity === 0 ? "Returned" : getStatusLabel(params.data.type);
        return (
          <span className={`rounded px-2 py-1 text-xs ${getStatusColor(params.data.type, params.data.quantity)}`}>
            {label}
          </span>
        );
      },
    },
    { field: "createdby", headerName: "Entry By", flex: 1, minWidth: 100 },
    {
      field: "createddate",
      headerName: "Entry Date",
      width: 100,
      valueFormatter: (params: { value: string }) =>
        params.value ? new Date(params.value).toLocaleDateString("en-GB") : "",
    },
    {
      headerName: "Actions",
      width: 130,
      sortable: false,
      cellRenderer: (params: { data: OutwardItem }) => {
        const row = params.data;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setSelectedId(row.id);
                setShowInfoModal(true);
              }}
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  const dataToDisplay = pageSize === 10 ? rowData : displayedData;
  const hasMoreData = pageSize !== 10 && displayedData.length < rowData.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inward Requests</h1>
          <p className="text-sm text-muted-foreground">Receive and manage inbound inventory</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDashboard(!showDashboard)}
            variant={showDashboard ? "default" : "outline"}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Dashboard
          </Button>
          {userType === "Admin" && (
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Inventory
            </Button>
          )}
        </div>
      </div>

      {/* Show Dashboard or Inward Table */}
      {showDashboard ? (
        <DashboardTable />
      ) : (
        <>
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

          {/* Department Filter Combobox */}
          <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={departmentOpen}
                className="w-40 justify-between px-3"
              >
                <span className="truncate">{departmentFilter ? departmentFilter : "Select Department..."}</span>
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
                      setCurrentPage(1);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        departmentFilter === "" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Departments
                  </CommandItem>
                  {departments.map((dept, idx) => {
                    const deptValue = typeof dept === "string" ? dept : dept.ddvalue || dept.value || "";
                    if (!deptValue) return null;
                    return (
                      <CommandItem
                        key={idx}
                        value={deptValue}
                        onSelect={() => {
                          setDepartmentFilter(deptValue === departmentFilter ? "" : deptValue);
                          setDepartmentOpen(false);
                          setCurrentPage(1);
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

          {/* Project Filter Combobox */}
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={projectOpen}
                className="w-40 justify-between px-3"
              >
                <span className="truncate">{projectFilter ? projectFilter : "Select Project..."}</span>
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
                      setCurrentPage(1);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        projectFilter === "" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Projects
                  </CommandItem>
                  {projects.map((proj, idx) => {
                    const projValue = typeof proj === "string" ? proj : proj.ddvalue || proj.value || "";
                    if (!projValue) return null;
                    return (
                      <CommandItem
                        key={idx}
                        value={projValue}
                        onSelect={() => {
                          setProjectFilter(projValue === projectFilter ? "" : projValue);
                          setProjectOpen(false);
                          setCurrentPage(1);
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

          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 sm:w-64"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="rounded-lg border border-border bg-card" style={{ height: "500px" }}>
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <AgGridReact
              ref={gridRef}
              rowData={dataToDisplay}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, resizable: true }}
              onGridReady={onGridReady}
              rowHeight={48}
              headerHeight={48}
              theme={themeQuartz}
              suppressPaginationPanel={true}
            />
          )}
        </div>
        {hasMoreData && (
          <div ref={loadMoreRef} className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              `Showing ${displayedData.length} of ${rowData.length} items. Scroll for more.`
            )}
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : dataToDisplay.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No requests found</p>
          </div>
        ) : (
          <>
            {dataToDisplay.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex gap-4">
                  {item.docpath ? (
                    <img
                      src={`${API_BASE_URL}/api/image/${item.docpath}`}
                      alt={item.product}
                      className="h-20 w-20 cursor-pointer rounded-lg object-cover"
                      onClick={() => {
                        setImageUrl(`${API_BASE_URL}/api/image/${item.docpath}`);
                        setShowImageModal(true);
                      }}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.product}</h3>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedId(item.id);
                            setShowInfoModal(true);
                          }}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${getStatusColor(item.type, item.quantity)}`}>
                        {item.type === "itemissued" && item.quantity === 0 ? "Returned" : getStatusLabel(item.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                      <span className="text-xs text-muted-foreground">{item.department}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.date ? new Date(item.date).toLocaleDateString("en-GB") : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {hasMoreData && (
              <div ref={loadMoreRef} className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  `Showing ${displayedData.length} of ${rowData.length}. Scroll for more.`
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalRows)} of {totalRows} entries
        </p>
        {pageSize === 10 && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <InventoryModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={reloadTable}
      />

      <InfoModal
        open={showInfoModal}
        onClose={() => {
          setShowInfoModal(false);
          setSelectedId(null);
        }}
        id={selectedId}
        tabletype="inventory"
      />

      <ImageModal
        open={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setImageUrl("");
        }}
        imageUrl={imageUrl}
      />
        </>
      )}
    </div>
  );
}
