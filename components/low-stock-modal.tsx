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
import { AlertCircle, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config";

interface LowStockModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  formType: "Add" | "Edit" | "Delete";
  lowStockId?: number | null;
  initialData?: any;
}

interface Option {
  ddvalue: string;
  id?: number;
}

export function LowStockModal({
  open,
  onClose,
  onSuccess,
  formType,
  lowStockId,
  initialData,
}: LowStockModalProps) {
  const [product, setProduct] = useState("");
  const [department, setDepartment] = useState("");
  const [project, setProject] = useState("");
  const [unit, setUnit] = useState("");
  const [lowStockLevel, setLowStockLevel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [products, setProducts] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [projectList, setProjectList] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);

  const [productOpen, setProductOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);

  const isReadOnly = formType === "Delete";

  // Fetch master data - only on open
  useEffect(() => {
    if (!open) return;
    
    setLoading(true);
    console.log("[v0] Fetching master data from:", `${API_BASE_URL}/api/master?id=1`);
    fetchApi(`${API_BASE_URL}/api/master?id=1`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        console.log("[v0] Master data response status:", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("[v0] Master data received:", data);
        const prodList = Array.isArray(data.products) 
          ? data.products.map((p: any) => ({ id: p.id, ddvalue: p.product || p.ddvalue })) 
          : [];
        const deptList = Array.isArray(data.departments) 
          ? data.departments.map((d: any) => ({ id: d.id, ddvalue: d.department || d.ddvalue })) 
          : [];
        const projList = Array.isArray(data.projects) 
          ? data.projects.map((p: any) => ({ id: p.id, ddvalue: p.project || p.ddvalue })) 
          : [];
        const unitList = Array.isArray(data.units) 
          ? data.units.map((u: any) => ({ id: u.id, ddvalue: u.unit || u.ddvalue })) 
          : [];

        setProducts(prodList);
        setDepartments(deptList);
        setProjectList(projList);
        setUnits(unitList);
      })
      .catch((err) => {
        console.error("[v0] Error fetching master data:", err.message);
        setErrorMessage(`Unable to connect to server. Please check if ${API_BASE_URL} is accessible.`);
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Fetch existing data for Edit/Delete
  useEffect(() => {
    if (!open || !lowStockId || (formType !== "Edit" && formType !== "Delete")) return;
    
    if (initialData) {
      setProduct(initialData.product || "");
      setDepartment(initialData.department || "");
      setProject(initialData.project || "");
      setUnit(initialData.unit || "");
      setLowStockLevel(initialData.lowstocklevel?.toString() || "");
      return;
    }

    setLoading(true);
    console.log("[v0] Fetching low stock data for ID:", lowStockId);
    fetchApi(`${API_BASE_URL}/api/lowstockmaster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lowStockId }),
    })
      .then((res) => {
        console.log("[v0] Low stock data response status:", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("[v0] Low stock data received:", data);
        const record = data.data?.[0];
        if (record) {
          setProduct(record.product || "");
          setDepartment(record.department || "");
          setProject(record.project || "");
          setUnit(record.unit || "");
          setLowStockLevel(record.lowstocklevel?.toString() || "");
        }
      })
      .catch((err) => {
        console.error("[v0] Error fetching low stock data:", err.message);
        setErrorMessage(`Unable to connect to server. Please check if ${API_BASE_URL} is accessible.`);
      })
      .finally(() => setLoading(false));
  }, [open, lowStockId, formType, initialData]);

  const handleSubmit = async () => {
    if (!product || !department || !project || !unit || !lowStockLevel) {
      setErrorMessage("All fields are required");
      return;
    }

    setSubmitLoading(true);
    setErrorMessage("");

    let productId = product;
    // If product is not a number (i.e. it's the name from initialData), find its ID
    if (isNaN(Number(product))) {
      const foundProduct = products.find((p) => p.ddvalue === product);
      if (foundProduct) {
        productId = String(foundProduct.id);
      }
    }

    try {
      const res = await fetchApi(`${API_BASE_URL}/api/lowstockmasterupdate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formType === "Add" ? null : lowStockId,
          product: productId,
          department,
          project,
          unit,
          lowstocklevel: parseInt(lowStockLevel),
          action: formType.toLowerCase(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess?.(data.message || `Low Stock ${formType}ed successfully`);
        onClose();
        setProduct("");
        setDepartment("");
        setProject("");
        setUnit("");
        setLowStockLevel("");
      } else {
        setErrorMessage(data.error || data.message || "An error occurred");
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setSubmitLoading(false);
    }
  };

  const header = `${formType} Low Stock`;
  const description =
    formType === "Add"
      ? "Create a new low stock alert for tracking."
      : formType === "Edit"
        ? "Update the low stock alert details."
        : "Confirm deletion of this low stock alert.";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{header}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Product Combobox */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Product</label>
              {formType === "Edit" || formType === "Delete" ? (
                <Input
                  disabled
                  value={product ? (products.find((p) => String(p.id) === String(product))?.ddvalue || product) : ""}
                  className="bg-muted text-muted-foreground"
                />
              ) : (
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productOpen}
                      className="w-full justify-between px-3"
                      disabled={isReadOnly}
                    >
                      <span className="truncate">
                        {product
                          ? products.find((p) => String(p.id) === String(product))?.ddvalue || product
                          : "Select Product..."}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto">
                        {products
                          .filter((p) => typeof p === "object" && p.ddvalue)
                          .map((p, idx) => (
                            <CommandItem
                              key={`prod-${idx}`}
                              value={p.ddvalue}
                              onSelect={(val) => {
                                setProduct(product === String(p.id) ? "" : String(p.id));
                                setProductOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  product === String(p.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {p.ddvalue}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Department Combobox */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Department</label>
              <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={departmentOpen}
                    className="w-full justify-between px-3"
                    disabled={isReadOnly}
                  >
                    <span className="truncate">
                      {department ? department : "Select Department..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search departments..." />
                    <CommandEmpty>No department found.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {departments
                        .filter((d) => typeof d === "object" && d.ddvalue)
                        .map((d, idx) => (
                          <CommandItem
                            key={`dept-${idx}`}
                            value={d.ddvalue}
                            onSelect={(val) => {
                              setDepartment(d.ddvalue === department ? "" : d.ddvalue);
                              setDepartmentOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                department === d.ddvalue ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {d.ddvalue}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Project Combobox */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Project</label>
              <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectOpen}
                    className="w-full justify-between px-3"
                    disabled={isReadOnly}
                  >
                    <span className="truncate">
                      {project ? project : "Select Project..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandEmpty>No project found.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {projectList
                        .filter((p) => typeof p === "object" && p.ddvalue)
                        .map((p, idx) => (
                          <CommandItem
                            key={`proj-${idx}`}
                            value={p.ddvalue}
                            onSelect={(val) => {
                              setProject(p.ddvalue === project ? "" : p.ddvalue);
                              setProjectOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                project === p.ddvalue ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {p.ddvalue}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Unit Combobox */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Unit</label>
              <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={unitOpen}
                    className="w-full justify-between px-3"
                    disabled={isReadOnly}
                  >
                    <span className="truncate">
                      {unit ? unit : "Select Unit..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search units..." />
                    <CommandEmpty>No unit found.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {units
                        .filter((u) => typeof u === "object" && u.ddvalue)
                        .map((u, idx) => (
                          <CommandItem
                            key={`unit-${idx}`}
                            value={u.ddvalue}
                            onSelect={(val) => {
                              setUnit(u.ddvalue === unit ? "" : u.ddvalue);
                              setUnitOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                unit === u.ddvalue ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {u.ddvalue}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Low Stock Level Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Low Stock Level</label>
              <Input
                type="number"
                placeholder="Enter low stock level"
                value={lowStockLevel}
                onChange={(e) => setLowStockLevel(e.target.value)}
                disabled={isReadOnly}
                className="bg-background text-foreground"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={submitLoading}>
            Cancel
          </Button>
          {formType !== "Delete" ? (
            <Button onClick={handleSubmit} disabled={submitLoading || loading}>
              {submitLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {formType}ing...
                </>
              ) : (
                `${formType} Low Stock`
              )}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={submitLoading || loading}
            >
              {submitLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Low Stock"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
