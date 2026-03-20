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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, X, Loader2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  formType: "Add" | "Edit" | "Delete";
  categoryId?: number | null;
  initialData?: any;
}

interface CategoryOption {
  id: number;
  ddvalue: string;
}

interface UnitOption {
  id: number;
  ddvalue: string;
}

export function CategoryModal({
  open,
  onClose,
  onSuccess,
  formType,
  categoryId,
  initialData,
}: CategoryModalProps) {
  const [category, setCategory] = useState("");
  const [productName, setProductName] = useState("");
  const [units, setUnits] = useState<string[]>([]);
  const [docpath, setDocpath] = useState("");
  const [lastPrice, setLastPrice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Combobox states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [unitSearch, setUnitSearch] = useState("");

  const modalConfig = {
    Add: {
      header: "Add New Category",
      imgLabel: "Add Image",
      button: "Save Category",
    },
    Edit: {
      header: "Update Category",
      imgLabel: "Change Image",
      button: "Update Category",
    },
    Delete: {
      header: "Delete Category",
      imgLabel: "Image",
      button: "Delete Category",
    },
  };

  const { header, imgLabel, button } = modalConfig[formType];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setCategory("");
      setProductName("");
      setUnits([]);
      setDocpath("");
      setLastPrice("");
      setErrorMessage("");
      setSelectedFile(null);
      setCategorySearch("");
      setUnitSearch("");
    }
  }, [open]);

  // Load master data
  useEffect(() => {
    if (open) {
      fetchApi(`${API_BASE_URL}/api/master?id=1`)
        .then((res) => res.json())
        .then((data) => {
          setCategories(data.categories || []);
          setUnitOptions(data.units || []);
        })
        .catch((err) => console.error("Error fetching master data:", err));
    }
  }, [open]);

  // Load category for Edit/Delete
  useEffect(() => {
    if ((formType === "Edit" || formType === "Delete") && categoryId && open) {
      if (initialData) {
        let parsedUnits: string[] = [];
        try {
          const rawUnits = Array.isArray(initialData.unit)
            ? initialData.unit
            : JSON.parse(initialData.unit || "[]");
          parsedUnits = rawUnits.map((u: any) => {
            const strVal = u.toString();
            const matchedUnit = unitOptions.find((opt) => opt.ddvalue === strVal || opt.id.toString() === strVal);
            return matchedUnit ? matchedUnit.id.toString() : strVal;
          });
        } catch {
          parsedUnits = [];
        }

        setCategory(initialData.category || "");
        setProductName(initialData.name || "");
        setDocpath(initialData.docpath || "");
        setLastPrice(initialData.lastprice?.toString() || "");
        setUnits(parsedUnits);
        return;
      }

      setDataLoading(true);

      fetchApi(`${API_BASE_URL}/api/categorydata?id=${categoryId}`)
        .then((res) => res.json())
        .then((data) => {
          const categoryData = data[0] || {};
          let parsedUnits: string[] = [];
          try {
            const rawUnits = Array.isArray(categoryData.unit)
              ? categoryData.unit
              : JSON.parse(categoryData.unit || "[]");
            parsedUnits = rawUnits.map((u: any) => {
              const strVal = u.toString();
              const matchedUnit = data.units?.find((opt: any) => opt.ddvalue === strVal || opt.id.toString() === strVal);
              return matchedUnit ? matchedUnit.id.toString() : strVal;
            });
          } catch {
            parsedUnits = [];
          }

          setCategory(categoryData.category || "");
          setProductName(categoryData.name || "");
          setDocpath(categoryData.docpath || "");
          setLastPrice(categoryData.lastprice?.toString() || "");
          setUnits(parsedUnits);
        })
        .catch((err) => console.error("Error fetching category data:", err))
        .finally(() => setDataLoading(false));
    }
  }, [formType, categoryId, open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("formtype", formType);
      formData.append("id", categoryId?.toString() || "");
      formData.append("userid", "1");
      formData.append("category", category);
      formData.append("name", productName);
      formData.append("lastPrice", lastPrice);
      units.forEach((unit) => {
        const matchedUnit = unitOptions.find(opt => opt.ddvalue === unit || opt.id.toString() === unit);
        const unitId = matchedUnit ? matchedUnit.id.toString() : unit;
        formData.append("unit[]", unitId);
      });

      if (selectedFile) {
        formData.append("document", selectedFile);
      }

      if (formType === "Delete") {
        formData.append("docpath", docpath);
      }

      const res = await fetchApi(`${API_BASE_URL}/api/categoryupdate`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        onSuccess?.(result.message);
        onClose();
      } else {
        setErrorMessage(result.error || "Operation failed");
      }
    } catch {
      setErrorMessage("Error updating category");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUnit = (unitValue: string) => {
    if (!units.includes(unitValue)) {
      setUnits([...units, unitValue]);
    }
    setUnitSearch("");
    setUnitOpen(false);
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    setUnits(units.filter((u) => u !== unitToRemove));
  };

  // Filter categories based on search
  const filteredCategories = categories.filter(
    (c) => c.ddvalue && c.ddvalue.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Filter units based on search (exclude already selected)
  const filteredUnits = unitOptions.filter(
    (u) => 
      u.ddvalue && 
      u.ddvalue.toLowerCase().includes(unitSearch.toLowerCase()) &&
      !units.includes(u.id.toString()) &&
      !units.includes(u.ddvalue)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{header}</DialogTitle>
          <DialogDescription>
            {formType === "Add" && "Fill in the details below to create a new category."}
            {formType === "Edit" && "Update the category details below."}
            {formType === "Delete" && "Are you sure you want to delete this category? This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category - Searchable Combobox */}
            {formType !== "Delete" ? (
              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground">Category</Label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="w-full justify-between bg-background text-foreground font-normal"
                    >
                      {category || "Select or type to search category..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search or add category..." 
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                          No categories found.
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredCategories.map((c, idx) => (
                            <CommandItem
                              key={idx}
                              value={c.ddvalue}
                              onSelect={(currentValue) => {
                                setCategory(currentValue);
                                setCategoryOpen(false);
                                setCategorySearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  category === c.ddvalue ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {c.ddvalue}
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
                <Label className="text-foreground">Category</Label>
                <Input value={category} disabled className="bg-muted text-foreground" />
              </div>
            )}

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Product Name</Label>
              <Input
                id="name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={formType === "Delete"}
                required={formType !== "Delete"}
                className="bg-background text-foreground"
              />
            </div>

            {/* Units - Multi-select Searchable Combobox */}
            {formType !== "Delete" && (
              <div className="space-y-2">
                <Label className="text-foreground">Units</Label>
                {units.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {units.map((unit, idx) => {
                      const matchedUnit = unitOptions.find(u => u.id.toString() === unit);
                      const displayValue = matchedUnit ? matchedUnit.ddvalue : unit;
                      return (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {displayValue}
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(unit)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )})}
                  </div>
                )}
                <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={unitOpen}
                      className="w-full justify-between bg-background text-foreground font-normal"
                    >
                      Select or type to add units...
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search or add unit..." 
                        value={unitSearch}
                        onValueChange={setUnitSearch}
                      />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                          No units found.
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredUnits.map((u, idx) => (
                            <CommandItem
                              key={idx}
                              value={u.id.toString()}
                              onSelect={(val) => handleSelectUnit(val)}
                            >
                              {u.ddvalue}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Image Preview */}
            {(formType === "Edit" || formType === "Delete") && docpath && (
              <div className="space-y-2">
                <Label className="text-foreground">Current Image</Label>
                <img
                  src={`${API_BASE_URL}/api/image/${docpath}`}
                  alt="Category"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
              </div>
            )}

            {/* File Upload */}
            {formType !== "Delete" && (
              <div className="space-y-2">
                <Label htmlFor="document" className="text-foreground">{imgLabel}</Label>
                <Input
                  id="document"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required={formType === "Add"}
                  className="bg-background text-foreground file:text-foreground"
                />
              </div>
            )}

            {/* Last Price */}
            <div className="space-y-2">
              <Label htmlFor="lastPrice" className="text-foreground">Last Price</Label>
              <Input
                id="lastPrice"
                type="number"
                step="0.01"
                value={lastPrice}
                onChange={(e) => setLastPrice(e.target.value)}
                disabled={formType === "Delete"}
                required={formType !== "Delete"}
                className="bg-background text-foreground"
              />
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={formType === "Delete" ? "destructive" : "default"}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  button
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
