"use client";

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
}

interface CategoryOption {
  ddvalue: string;
}

interface UnitOption {
  ddvalue: string;
}

export function CategoryModal({
  open,
  onClose,
  onSuccess,
  formType,
  categoryId,
}: CategoryModalProps) {
  const [category, setCategory] = useState("");
  const [productName, setProductName] = useState("");
  const [units, setUnits] = useState<string[]>([]);
  const [docpath, setDocpath] = useState("");
  const [lastPrice, setLastPrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewUnit, setIsNewUnit] = useState(false);
  
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
      setMinStock("");
      setErrorMessage("");
      setSelectedFile(null);
      setIsNewCategory(false);
      setIsNewUnit(false);
      setCategorySearch("");
      setUnitSearch("");
    }
  }, [open]);

  // Load master data
  useEffect(() => {
    if (open) {
      fetch(`${API_URL}/api/master?id=1`)
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
      setDataLoading(true);

      fetch(`${API_URL}/api/categorydata?id=${categoryId}`)
        .then((res) => res.json())
        .then((data) => {
          const categoryData = data[0] || {};
          let parsedUnits: string[] = [];
          try {
            parsedUnits = Array.isArray(categoryData.unit)
              ? categoryData.unit
              : JSON.parse(categoryData.unit || "[]");
          } catch {
            parsedUnits = [];
          }

          setCategory(categoryData.category || "");
          setProductName(categoryData.name || "");
          setDocpath(categoryData.docpath || "");
          setLastPrice(categoryData.lastprice?.toString() || "");
          setMinStock(categoryData.lowstocklevel?.toString() || "");
          setUnits(parsedUnits);
        })
        .catch((err) => console.error("Error fetching category data:", err))
        .finally(() => setDataLoading(false));
    }
  }, [formType, categoryId, open]);

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
      formData.append("lowstocklevel", minStock);
      units.forEach((unit) => formData.append("unit[]", unit));

      if (selectedFile) {
        formData.append("document", selectedFile);
      }

      if (formType === "Delete") {
        formData.append("docpath", docpath);
      }

      const res = await fetch(`${API_URL}/api/categoryupdate`, {
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

  const handleAddNewCategory = () => {
    const trimmedCategory = categorySearch.trim();
    if (!trimmedCategory) return;
    
    // Check if category already exists (case-insensitive)
    const existingCategory = categories.find(
      (c) => c.ddvalue.toLowerCase() === trimmedCategory.toLowerCase()
    );
    
    if (existingCategory) {
      setCategory(existingCategory.ddvalue);
      setErrorMessage(`Category "${existingCategory.ddvalue}" already exists. Selected it for you.`);
      setIsNewCategory(false);
    } else {
      setCategories([...categories, { ddvalue: trimmedCategory }]);
      setCategory(trimmedCategory);
      setIsNewCategory(true);
      setErrorMessage("");
    }
    setCategorySearch("");
    setCategoryOpen(false);
  };

  const handleAddNewUnit = () => {
    const trimmedUnit = unitSearch.trim();
    if (!trimmedUnit) return;
    
    // Check if unit already exists in selected units (case-insensitive)
    if (units.some((u) => u.toLowerCase() === trimmedUnit.toLowerCase())) {
      setErrorMessage(`Unit "${trimmedUnit}" is already selected.`);
      return;
    }
    
    // Check if unit exists in available options (case-insensitive)
    const existingUnit = unitOptions.find(
      (u) => u.ddvalue.toLowerCase() === trimmedUnit.toLowerCase()
    );
    
    if (existingUnit) {
      setUnits([...units, existingUnit.ddvalue]);
    } else {
      setUnits([...units, trimmedUnit]);
      setUnitOptions([...unitOptions, { ddvalue: trimmedUnit }]);
      setIsNewUnit(true);
    }
    setUnitSearch("");
    setUnitOpen(false);
    setErrorMessage("");
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
      !units.includes(u.ddvalue)
  );

  // Check if search term matches any existing option
  const categorySearchMatchesExisting = categories.some(
    (c) => c.ddvalue.toLowerCase() === categorySearch.trim().toLowerCase()
  );
  const unitSearchMatchesExisting = unitOptions.some(
    (u) => u.ddvalue.toLowerCase() === unitSearch.trim().toLowerCase()
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
                      <CommandList>
                        <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                          {categorySearch.trim() ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={handleAddNewCategory}
                            >
                              <Plus className="h-4 w-4" />
                              Add &quot;{categorySearch.trim()}&quot; as new category
                            </button>
                          ) : (
                            "No categories found."
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredCategories.map((c, idx) => (
                            <CommandItem
                              key={idx}
                              value={c.ddvalue}
                              onSelect={(currentValue) => {
                                setCategory(currentValue);
                                setIsNewCategory(false);
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
                          {/* Show "Add new" option if search doesn't match existing */}
                          {categorySearch.trim() && !categorySearchMatchesExisting && filteredCategories.length > 0 && (
                            <CommandItem
                              value={`add-new-${categorySearch}`}
                              onSelect={handleAddNewCategory}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add &quot;{categorySearch.trim()}&quot; as new category
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {isNewCategory && (
                  <p className="text-sm text-warning flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    This category will be added as a new entry.
                  </p>
                )}
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
                    {units.map((unit, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {unit}
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(unit)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
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
                      <CommandList>
                        <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                          {unitSearch.trim() ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={handleAddNewUnit}
                            >
                              <Plus className="h-4 w-4" />
                              Add &quot;{unitSearch.trim()}&quot; as new unit
                            </button>
                          ) : (
                            "No units found."
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredUnits.map((u, idx) => (
                            <CommandItem
                              key={idx}
                              value={u.ddvalue}
                              onSelect={() => handleSelectUnit(u.ddvalue)}
                            >
                              {u.ddvalue}
                            </CommandItem>
                          ))}
                          {/* Show "Add new" option if search doesn't match existing */}
                          {unitSearch.trim() && 
                           !unitSearchMatchesExisting && 
                           !units.some(u => u.toLowerCase() === unitSearch.trim().toLowerCase()) &&
                           filteredUnits.length > 0 && (
                            <CommandItem
                              value={`add-new-${unitSearch}`}
                              onSelect={handleAddNewUnit}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add &quot;{unitSearch.trim()}&quot; as new unit
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {isNewUnit && (
                  <p className="text-sm text-warning flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    New unit(s) will be added.
                  </p>
                )}
              </div>
            )}

            {/* Image Preview */}
            {(formType === "Edit" || formType === "Delete") && docpath && (
              <div className="space-y-2">
                <Label className="text-foreground">Current Image</Label>
                <img
                  src={`${API_URL}/api/image/${docpath}`}
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

            {/* Minimum Stock Level */}
            <div className="space-y-2">
              <Label htmlFor="minStock" className="text-foreground">Minimum Stock Level</Label>
              <Input
                id="minStock"
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
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
