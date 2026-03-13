"use client";

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
import { CategoryModal } from "@/components/category-modal";
import { ImageModal } from "@/components/image-modal";
import { Plus, Pencil, Trash2, ArrowLeft, Search, Download, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";

ModuleRegistry.registerModules([AllCommunityModule]);

const CHUNK_SIZE = 20; // Load 20 items at a time for infinite scroll

interface CategoryRow {
  id: number;
  category: string;
  name: string;
  docpath: string;
  lastprice: number;
  lowstocklevel: number;
  modifiedby: string;
  createddate: string;
}

interface ApiResponse {
  data: CategoryRow[];
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
function MobileProductCard({
  item,
  onEdit,
  onDelete,
  onImageClick,
}: {
  item: CategoryRow;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onImageClick: (docpath: string) => void;
}) {
  return (
    <div className="flex gap-4 p-4 bg-card border border-border rounded-lg">
      {/* Image on the left */}
      <div className="flex-shrink-0">
        {item.docpath ? (
          <button
            onClick={() => onImageClick(item.docpath)}
            className="block"
          >
            <img
              src={`${API_URL}/api/image/${item.docpath}`}
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
            />
          </button>
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
            <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{item.category}</p>
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
            <span className="text-muted-foreground">Price: </span>
            <span className="text-foreground font-medium">
              {item.lastprice ? `₹${Number(item.lastprice).toFixed(2)}` : "-"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Min Stock: </span>
            <span className="text-foreground font-medium">{item.lowstocklevel || "-"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">By: </span>
            <span className="text-foreground">{item.modifiedby || "-"}</span>
            <span className="text-muted-foreground"> on </span>
            <span className="text-foreground">
              {item.createddate ? new Date(item.createddate).toLocaleDateString("en-GB") : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategoriesTable() {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  // Data and pagination state
  const [rowData, setRowData] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Infinite scroll state
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Reset data when search or pageSize changes
  useEffect(() => {
    setRowData([]);
    setCurrentOffset(0);
    setHasMore(true);
  }, [debouncedSearch, pageSize]);

  // Fetch data function
  const fetchData = useCallback(async (offset: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // For pageSize 10, use traditional pagination
      // For 50, 100, All (-1) use chunked loading
      const useInfiniteScroll = pageSize > 10 || pageSize === -1;
      const fetchLength = useInfiniteScroll ? CHUNK_SIZE : pageSize;
      
      const requestBody = {
        draw: 1,
        start: offset,
        length: fetchLength,
        order: [],
        columns: [
          { data: "category", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "name", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "docpath", name: "", searchable: false, orderable: false, search: { value: "", regex: false } },
          { data: "lastprice", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "lowstocklevel", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "modifiedby", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "createddate", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
        ],
        search: { value: debouncedSearch, regex: false },
      };

      const response = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result: ApiResponse = await response.json();
      const newData = result.data || [];
      
      setTotalRecords(result.recordsFiltered || result.recordsTotal || 0);
      
      if (append) {
        setRowData(prev => [...prev, ...newData]);
      } else {
        setRowData(newData);
      }

      // Check if there's more data to load
      const newOffset = offset + newData.length;
      const maxRecords = pageSize === -1 ? result.recordsFiltered : Math.min(pageSize, result.recordsFiltered);
      setHasMore(newOffset < maxRecords);
      setCurrentOffset(newOffset);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      if (!append) {
        setRowData([]);
        setTotalRecords(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pageSize, debouncedSearch]);

  // Initial fetch
  useEffect(() => {
    fetchData(0, false);
  }, [debouncedSearch, pageSize]);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && (pageSize > 10 || pageSize === -1)) {
      fetchData(currentOffset, true);
    }
  }, [loadingMore, hasMore, currentOffset, pageSize, fetchData]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (pageSize === 10) return; // Don't use infinite scroll for 10 items

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observerRef.current = observer;

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore, pageSize]);

  // Observe the load more trigger element
  useEffect(() => {
    if (loadMoreTriggerRef.current && observerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }
    return () => {
      if (loadMoreTriggerRef.current && observerRef.current) {
        observerRef.current.unobserve(loadMoreTriggerRef.current);
      }
    };
  }, [rowData, pageSize]);

  // Handle scroll for AG Grid (desktop)
  const handleGridScroll = useCallback(() => {
    if (!gridApi || pageSize === 10 || loadingMore || !hasMore) return;
    
    const verticalScrollPosition = gridApi.getVerticalPixelRange();
    const totalHeight = gridApi.getDisplayedRowCount() * 48; // rowHeight
    const viewportHeight = 500; // Grid height
    
    if (verticalScrollPosition.bottom >= totalHeight - 100) {
      loadMore();
    }
  }, [gridApi, pageSize, loadingMore, hasMore, loadMore]);

  const handleEdit = (id: number) => {
    setSelectedId(id);
    setShowEditModal(true);
  };

  const handleDelete = (id: number) => {
    setSelectedId(id);
    setShowDeleteModal(true);
  };

  const handleImageClick = (docpath: string) => {
    setImageUrl(`${API_URL}/categories/${docpath}`);
    setShowImageModal(true);
  };

  const reloadTable = () => {
    setRowData([]);
    setCurrentOffset(0);
    setHasMore(true);
    fetchData(0, false);
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const requestBody = {
        draw: 1,
        start: 0,
        length: -1,
        order: [],
        columns: [
          { data: "category", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "name", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "docpath", name: "", searchable: false, orderable: false, search: { value: "", regex: false } },
          { data: "lastprice", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "lowstocklevel", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "modifiedby", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
          { data: "createddate", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
        ],
        search: { value: debouncedSearch, regex: false },
      };

      const response = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result: ApiResponse = await response.json();
      const allData = result.data || [];

      if (allData.length === 0) {
        alert("No data to export");
        return;
      }

      const headers = ["Category", "Product", "Last Price", "Min Stock", "Created By", "Created Date"];
      const csvRows = [
        headers.join(","),
        ...allData.map((row) => [
          `"${(row.category || "").replace(/"/g, '""')}"`,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          row.lastprice || "",
          row.lowstocklevel || "",
          `"${(row.modifiedby || "").replace(/"/g, '""')}"`,
          row.createddate ? new Date(row.createddate).toLocaleDateString("en-GB") : "",
        ].join(","))
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `categories_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data");
    }
  };

  const columnDefs: ColDef<CategoryRow>[] = [
    {
      headerName: "Category",
      field: "category",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      headerName: "Product",
      field: "name",
      flex: 1.5,
      minWidth: 150,
      sortable: true,
    },
    {
      headerName: "Image",
      field: "docpath",
      width: 80,
      sortable: false,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;
        return (
          <button
            onClick={() => handleImageClick(params.value)}
            className="flex items-center justify-center w-full h-full"
          >
            <img
              src={`${API_URL}/api/image/${params.value}`}
              alt="Category"
              className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
            />
          </button>
        );
      },
    },
    {
      headerName: "Last Price",
      field: "lastprice",
      width: 110,
      sortable: true,
      valueFormatter: (params) =>
        params.value ? `₹${Number(params.value).toFixed(2)}` : "",
    },
    {
      headerName: "Min Stock",
      field: "lowstocklevel",
      width: 100,
      sortable: true,
    },
    {
      headerName: "Created By",
      field: "modifiedby",
      width: 120,
      sortable: true,
    },
    {
      headerName: "Created Date",
      field: "createddate",
      width: 120,
      sortable: true,
      valueFormatter: (params) => {
        if (!params.value) return "";
        return new Date(params.value).toLocaleDateString("en-GB");
      },
    },
    {
      headerName: "Actions",
      width: 100,
      sortable: false,
      cellRenderer: (params: { data: CategoryRow }) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center justify-center gap-1 h-full">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => handleEdit(params.data.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(params.data.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  const handlePageSizeChange = (value: string) => {
    const newSize = value === "all" ? -1 : parseInt(value, 10);
    setPageSize(newSize);
  };

  // Calculate displayed records info
  const displayedCount = rowData.length;
  const showingText = totalRecords > 0 
    ? `Showing ${displayedCount} of ${totalRecords} entries`
    : "No entries found";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Master Catalogue
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your inventory categories and products
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Search and Page Size Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select value={pageSize === -1 ? "all" : pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
        <div 
          ref={desktopScrollRef}
          className="h-[500px] w-full relative overflow-auto"
          onScroll={handleGridScroll}
        >
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading...</span>
              </div>
            </div>
          )}
          <AgGridReact
            ref={gridRef}
            theme={myTheme}
            columnDefs={columnDefs}
            rowData={rowData}
            onGridReady={onGridReady}
            rowHeight={48}
            headerHeight={48}
            suppressCellFocus={true}
            onBodyScroll={handleGridScroll}
            defaultColDef={{
              resizable: true,
            }}
          />
        </div>
        {/* Loading more indicator for desktop */}
        {loadingMore && (pageSize > 10 || pageSize === -1) && (
          <div className="flex items-center justify-center py-3 border-t border-border bg-muted/30">
            <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Loading more...</span>
          </div>
        )}
      </div>

      {/* Mobile Card View - Visible only on mobile */}
      <div ref={mobileScrollRef} className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Loading...</span>
            </div>
          </div>
        ) : rowData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-2" />
            <p>No products found</p>
          </div>
        ) : (
          <>
            {rowData.map((item) => (
              <MobileProductCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onImageClick={handleImageClick}
              />
            ))}
            {/* Infinite scroll trigger for mobile */}
            {(pageSize > 10 || pageSize === -1) && hasMore && (
              <div ref={loadMoreTriggerRef} className="flex items-center justify-center py-4">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                ) : (
                  <div className="h-4" /> 
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with record count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{showingText}</span>
        {hasMore && (pageSize > 10 || pageSize === -1) && !loading && (
          <span className="text-xs">Scroll down to load more</span>
        )}
      </div>

      {/* Modals */}
      <CategoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        formType="Add"
        itemId={null}
        onSuccess={reloadTable}
      />

      <CategoryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedId(null);
        }}
        formType="Edit"
        itemId={selectedId}
        onSuccess={reloadTable}
      />

      <CategoryModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedId(null);
        }}
        formType="Delete"
        itemId={selectedId}
        onSuccess={reloadTable}
      />

      <ImageModal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setImageUrl("");
        }}
        imageUrl={imageUrl}
      />
    </div>
  );
}
