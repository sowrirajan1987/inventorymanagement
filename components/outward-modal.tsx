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
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertCircle, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config";

interface OutwardModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (message?: string) => void;
  formType: "Add" | "Return";
  categoryId?: number | null;
}

interface Department {
  ddvalue: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  balance: number;
  docpath: string;
  unit: string;
  project: string;
  department: string;
}

export function OutwardModal({
  open,
  onClose,
  onSuccess,
  formType,
  categoryId,
}: OutwardModalProps) {
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [product, setProduct] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [docpath, setDocpath] = useState("");
  const [quantity, setQuantity] = useState("");
  const [returnQuantity, setReturnQuantity] = useState("");
  const [rent, setRent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Combobox open states
  const [deptOpen, setDeptOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);

  const modalConfig = {
    Add: { header: "New Request", qtyLabel: "Quantity", button: "Request" },
    Return: { header: "Return Request", qtyLabel: "Return Quantity", button: "Return" },
  };

  const { header, qtyLabel, button } = modalConfig[formType];

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setDepartment("");
      setProduct("");
      setCategory("");
      setProject("");
      setDocpath("");
      setQuantity("");
      setReturnQuantity("");
      setRent("");
      setDate(new Date().toISOString().split("T")[0]);
      setRemarks("");
      setErrorMessage("");
    }
  }, [open]);

  // Load master data (departments + all products)
  useEffect(() => {
    if (!open) return;
    const fetchMasterData = async () => {
      try {
        const res = await fetchApi(`${API_BASE_URL}/api/master?id=1`);
        const data = await res.json();
        setDepartments(data.departments || []);
        setProducts(data.deptInventories || []);
      } catch (err) {
        console.error("Error fetching master data:", err);
      }
    };
    fetchMasterData();
  }, [open]);

  // Load Return item data
  useEffect(() => {
    if (formType === "Return" && categoryId && open) {
      setDataLoading(true);
      fetchApi(`${API_BASE_URL}/api/returnitem?id=${categoryId}`)
        .then((res) => res.json())
        .then((data) => {
          const row = Array.isArray(data) ? data[0] : data;
          if (row) {
            setCategory(row.category || "");
            setProduct(row.product || "");
            setProject(row.project || "");
            setDepartment(row.department || "");
            setDocpath(row.docpath || "");
            setQuantity(String(row.quantity || ""));
            setRent(row.rented || "");
          }
        })
        .catch((err) => console.error("Error fetching return item:", err))
        .finally(() => setDataLoading(false));
    }
  }, [formType, categoryId, open]);

  // Clear product when department changes (Add mode)
  useEffect(() => {
    if (formType === "Add") {
      setProduct("");
    }
  }, [department, formType]);

  // Filter products by selected department
  const filteredProducts = useMemo(() => {
    if (!department) return [];
    return products.filter((p) => p.department === department);
  }, [products, department]);

  // Parse the selected product value (pipe-delimited: name|unit|id|project)
  const selectedProduct = useMemo<Product | null>(() => {
    if (!product || formType === "Return") return null;
    const parts = product.split("|");
    return products.find(
      (p) => p.name === parts[0] && String(p.id) === parts[2]
    ) || null;
  }, [product, products, formType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("formtype", formType);
      formData.append("id", String(categoryId ?? ""));
      formData.append("department", department);
      formData.append("selectedproduct", product);
      formData.append("returnproject", project);
      formData.append("quantity", formType === "Add" ? quantity : returnQuantity);
      formData.append("rent", rent);
      formData.append("purchasedate", date);
      formData.append("remarks", remarks);

      const res = await fetchApi(`${API_BASE_URL}/api/transactionsupdate`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        onSuccess?.(data.message);
        onClose();
      } else {
        setErrorMessage(data.error || "An error occurred. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{header}</DialogTitle>
          <DialogDescription>
            {formType === "Add"
              ? "Select a department and product to create an outward request."
              : "Review the item details and enter the return quantity."}
          </DialogDescription>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Department */}
            {formType === "Add" ? (
              <div className="space-y-2">
                <Label>Department <span className="text-destructive">*</span></Label>
                <Popover open={deptOpen} onOpenChange={setDeptOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-background text-foreground font-normal"
                    >
                      {department || "Select Department"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search department..." />
                      <CommandList>
                        <CommandEmpty>No department found.</CommandEmpty>
                        <CommandGroup>
                          {departments
                            .filter((d) => d.ddvalue?.trim())
                            .map((dept, idx) => (
                              <CommandItem
                                key={idx}
                                value={dept.ddvalue}
                                onSelect={() => {
                                  setDepartment(dept.ddvalue);
                                  setDeptOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", department === dept.ddvalue ? "opacity-100" : "opacity-0")} />
                                {dept.ddvalue}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={department} disabled className="bg-muted" />
              </div>
            )}

            {/* Category (Return only) */}
            {formType === "Return" && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} disabled className="bg-muted" />
              </div>
            )}

            {/* Product */}
            {formType === "Add" ? (
              <div className="space-y-2">
                <Label>Product <span className="text-destructive">*</span></Label>
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      disabled={!department}
                      className="w-full justify-between bg-background text-foreground font-normal"
                    >
                      {product
                        ? (
                          <span className="flex items-center gap-2">
                            {selectedProduct?.docpath && (
                              <img
                                src={`${API_BASE_URL}/api/image/${selectedProduct.docpath}`}
                                alt=""
                                className="h-6 w-6 rounded object-cover"
                              />
                            )}
                            <span>{product.split("|")[0]}</span>
                          </span>
                        )
                        : (department ? "Select Product" : "Select a department first")
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search product..." />
                      <CommandList className="max-h-60">
                        <CommandEmpty>No products found for this department.</CommandEmpty>
                        <CommandGroup>
                          {filteredProducts.map((p, idx) => {
                            const val = `${p.name}|${p.unit}|${p.id}|${p.project}`;
                            const unitLabel = p.unit && p.unit !== "Nos" && p.unit !== "Number" ? ` {${p.unit}}` : "";
                            return (
                              <CommandItem
                                key={`${p.id}-${idx}`}
                                value={`${p.name} ${p.category}`}
                                onSelect={() => {
                                  setProduct(val);
                                  setProductOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  {p.docpath ? (
                                    <img
                                      src={`${API_BASE_URL}/api/image/${p.docpath}`}
                                      alt={p.name}
                                      className="h-12 w-12 rounded object-cover shrink-0"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded bg-muted shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground truncate">{p.name}{unitLabel}</p>
                                    <p className="text-xs text-muted-foreground">Category: {p.category}</p>
                                    <p className="text-xs text-muted-foreground">Available: {p.balance}</p>
                                    {p.project && p.project !== "Not Applicable" && (
                                      <p className="text-xs text-muted-foreground">Project: {p.project}</p>
                                    )}
                                  </div>
                                  <Check className={cn("ml-auto h-4 w-4 shrink-0", product === val ? "opacity-100" : "opacity-0")} />
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {/* Project warning */}
                {product && product.split("|")[3] && product.split("|")[3] !== "Not Applicable" && (
                  <p className="text-xs text-destructive">
                    This product will be issued from the inventory of <strong>{product.split("|")[3]}</strong>.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Product</Label>
                <div className="flex items-center gap-3 rounded-md border border-border bg-muted px-3 py-2">
                  {docpath && (
                    <img
                      src={`${API_BASE_URL}/api/image/${docpath}`}
                      alt={product}
                      className="h-10 w-10 rounded object-cover shrink-0"
                    />
                  )}
                  <span className="text-sm text-foreground">{product}</span>
                </div>
              </div>
            )}

            {/* Quantity (Add mode — original qty, read-only) */}
            <div className="space-y-2">
              <Label>Quantity {formType === "Add" && <span className="text-destructive">*</span>}</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={formType !== "Add"}
                required={formType === "Add"}
                min={1}
                className={formType !== "Add" ? "bg-muted" : "bg-background"}
              />
            </div>

            {/* Rent selector (Add only) */}
            {formType === "Add" ? (
              <div className="space-y-2">
                <Label>Is the product rented? <span className="text-destructive">*</span></Label>
                <Popover open={rentOpen} onOpenChange={setRentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-background text-foreground font-normal"
                    >
                      {rent === "Lended" ? "Yes" : rent === "No" ? "No" : "Select"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {[{ value: "Lended", label: "Yes" }, { value: "No", label: "No" }].map((opt) => (
                            <CommandItem
                              key={opt.value}
                              value={opt.value}
                              onSelect={() => { setRent(opt.value); setRentOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", rent === opt.value ? "opacity-100" : "opacity-0")} />
                              {opt.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Is the product rented?</Label>
                <Input value={rent === "Lended" ? "Yes" : rent || "-"} disabled className="bg-muted" />
              </div>
            )}

            {/* Return Quantity (Return mode only) */}
            {formType === "Return" && (
              <div className="space-y-2">
                <Label>{qtyLabel} <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  required
                  min={1}
                  className="bg-background"
                />
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-background"
              />
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="bg-background resize-none"
                placeholder="Optional remarks..."
              />
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Processing..." : button}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
