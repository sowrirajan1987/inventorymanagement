"use client";

import { fetchApi } from '@/lib/api';
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Check, ChevronsUpDown, AlertCircle, Package } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

interface Department {
  ddvalue?: string;
  value?: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  docpath: string;
  unit: string;
  department?: string;
  project?: string;
  available?: number;
  balance?: number;
}

interface Project {
  ddvalue?: string;
  value?: string;
}

interface InventoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function InventoryModal({ open, onClose, onSuccess }: InventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [department, setDepartment] = useState("");
  const [project, setProject] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [purchasedate, setPurchasedate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  
  const [deptOpen, setDeptOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch master data (departments, projects, and all products from deptInventories)
  useEffect(() => {
    if (!open) return;
    
    const fetchMasterData = async () => {
      setDataLoading(true);
      try {
        const res = await fetchApi(`${API_BASE_URL}/api/master?id=1`);
        const data = await res.json();
        
        // Handle departments
        const deptList = data.departments || data.departmentList || [];
        const deptArray = Array.isArray(deptList[0]) ? deptList[0] : deptList;
        setDepartments(deptArray.filter((d: any) => {
          const val = typeof d === "string" ? d : d.ddvalue || d.value || d.departments || d.department;
          return val && val.trim();
        }));
        
        // Handle projects
        const projList = data.project || data.projects || [];
        const projArray = Array.isArray(projList[0]) ? projList[0] : projList;
        setProjects(projArray.filter((p: any) => {
          const val = typeof p === "string" ? p : p.ddvalue || p.value || p.projects || p.project;
          return val && val.trim();
        }));
        
        // Handle products from deptInventories
        const prodList = data.deptInventories || data.expandedInventories || [];
        setAllProducts(Array.isArray(prodList) ? prodList : []);
      } catch (err) {
        console.error("[v0] Error fetching master data:", err);
        setErrorMessage("Error loading data");
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchMasterData();
  }, [open]);

  // Filter products by selected department
  const filteredProducts = useMemo(() => {
    if (!department) return [];
    return allProducts.filter((p) => p.department === department);
  }, [allProducts, department]);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setDepartment("");
      setProject("");
      setProduct("");
      setQuantity("");
      setPrice("");
      setPurchasedate(new Date().toISOString().split("T")[0]);
      setRemarks("");
      setErrorMessage("");
      setSelectedProduct(null);
    }
  }, [open]);

  // Clear product when department changes
  useEffect(() => {
    setProduct("");
    setSelectedProduct(null);
  }, [department]);

  const handleProductSelect = (prod: Product) => {
    setSelectedProduct(prod);
    setProduct(prod.name);
    setProductOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!department || !product || !project || !quantity || !price) {
      setErrorMessage("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const submitData = new FormData();
      submitData.append("formtype", "Add");
      submitData.append("userid", "1");
      submitData.append("tabletype", "inventory");
      submitData.append("department", department);
      submitData.append("product", product);
      submitData.append("project", project);
      submitData.append("quantity", quantity);
      submitData.append("lastPrice", price);
      submitData.append("purchasedate", purchasedate);
      submitData.append("remarks", remarks);

      const res = await fetchApi(`${API_BASE_URL}/api/inventoryupdate`, {
        method: "POST",
        body: submitData,
      });

      const result = await res.json();

      if (result.success) {
        onSuccess?.(result.message || "Inventory added successfully");
        // Reset form
        setDepartment("");
        setProject("");
        setProduct("");
        setQuantity("");
        setPrice("");
        setPurchasedate(new Date().toISOString().split("T")[0]);
        setRemarks("");
        setSelectedProduct(null);
        onClose();
      } else {
        setErrorMessage(result.error || "Error adding inventory");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error adding inventory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Inventory</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new item to your inventory.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Department Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Popover open={deptOpen} onOpenChange={setDeptOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={deptOpen}
                  className="w-full justify-between px-3"
                  type="button"
                >
                  <span className="truncate">
                    {department || "Select Department..."}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search departments..." />
                  <CommandEmpty>No department found.</CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-y-auto">
                    {departments.map((dept, idx) => {
                      const deptValue = typeof dept === "string" ? dept : dept.ddvalue || dept.value || dept.departments || dept.department || "";
                      if (!deptValue) return null;
                      return (
                        <CommandItem
                          key={`dept-${idx}`}
                          value={deptValue}
                          onSelect={() => {
                            setDepartment(deptValue);
                            setDeptOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              department === deptValue ? "opacity-100" : "opacity-0"
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
          </div>

          {/* Project Dropdown - Show only after department selection */}
          {department && (
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectOpen}
                    className="w-full justify-between px-3"
                    type="button"
                  >
                    <span className="truncate">
                      {project || "Select Project..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandEmpty>No project found.</CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-y-auto">
                    {projects.map((proj, idx) => {
                        const projValue = typeof proj === "string" ? proj : proj.ddvalue || proj.value || proj.projects || proj.project || "";
                        if (!projValue) return null;
                        return (
                          <CommandItem
                            key={`proj-${idx}`}
                            value={projValue}
                            onSelect={() => {
                              setProject(projValue);
                              setProjectOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                project === projValue ? "opacity-100" : "opacity-0"
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
          )}

          {/* Product Dropdown - Show only after department selection */}
          {department && (
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productOpen}
                    className="w-full justify-between px-3"
                    type="button"
                  >
                    <span className="truncate">
                      {product || "Select Product..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandEmpty>No product found.</CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-y-auto">
                    {filteredProducts.map((prod, idx) => (
                        <CommandItem
                          key={`prod-${prod.id}-${idx}`}
                          value={prod.name}
                          onSelect={() => handleProductSelect(prod)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              product === prod.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{prod.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {prod.category}
                              {prod.available !== undefined && ` • Available: ${prod.available}`}
                              {prod.unit && ` • ${prod.unit}`}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0"
              step="0.01"
              className="bg-background"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price *</Label>
            <Input
              id="price"
              type="number"
              placeholder="Enter price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              className="bg-background"
            />
          </div>

          {/* Purchase Date */}
          <div className="space-y-2">
            <Label htmlFor="purchasedate">Purchase Date</Label>
            <Input
              id="purchasedate"
              type="date"
              value={purchasedate}
              onChange={(e) => setPurchasedate(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              placeholder="Enter remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="bg-background"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Inventory
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
