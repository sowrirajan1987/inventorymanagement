"use client";

import { fetchApi } from '@/lib/api';
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config";

interface DropdownModalProps {
  open: boolean;
  onClose: () => void;
  formType: "Add" | "Edit" | "Delete";
  dropdownId: number | null;
  initialData?: any;
  onSuccess: () => void;
}

export function DropdownModal({
  open,
  onClose,
  formType,
  dropdownId,
  initialData,
  onSuccess,
}: DropdownModalProps) {
  const [ddtype, setDdtype] = useState("");
  const [ddvalue, setDdvalue] = useState("");
  const [ddtypeList, setDdtypeList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch dropdown types on modal open
  useEffect(() => {
    if (!open) return;
    
    setLoading(true);
    fetchApi(`${API_BASE_URL}/api/dropdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: 0,
        length: 10000,
        draw: 1,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const uniqueTypes = [...new Set((data.data || []).map((item: any) => item.ddtype))];
        setDdtypeList(uniqueTypes.sort());
      })
      .catch((err) => {
        console.error("Error fetching dropdown types:", err);
        setErrorMessage("Failed to load dropdown types");
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Fetch existing data for Edit/Delete
  useEffect(() => {
    if (!open || !dropdownId || (formType !== "Edit" && formType !== "Delete")) return;
    
    if (initialData) {
      setDdtype(initialData.ddtype || "");
      setDdvalue(initialData.ddvalue || "");
      return;
    }

    setLoading(true);
    fetchApi(`${API_BASE_URL}/api/dropdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dropdownId }),
    })
      .then((res) => res.json())
      .then((data) => {
        const record = data.data?.[0];
        if (record) {
          setDdtype(record.ddtype || "");
          setDdvalue(record.ddvalue || "");
        }
      })
      .catch((err) => {
        console.error("Error fetching dropdown data:", err);
        setErrorMessage("Failed to load dropdown data");
      })
      .finally(() => setLoading(false));
  }, [open, dropdownId, formType, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!ddtype || !ddvalue) {
      setErrorMessage("Please fill in all required fields");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("ddtype", ddtype);
      formData.append("ddvalue", ddvalue);
      if (dropdownId) formData.append("id", String(dropdownId));

      await fetchApi(
        `${API_BASE_URL}/api/dropdownupdate?action=${formType.toLowerCase()}`,
        {
          method: "POST",
          body: formData,
        }
      );

      onSuccess();
      onClose();
      setDdtype("");
      setDdvalue("");
    } catch (err: any) {
      console.error("Error submitting form:", err);
      setErrorMessage(err.message || "Failed to submit form. Please try again.");
    }
  };

  const modalTitle = {
    Add: "Add Dropdown",
    Edit: "Edit Dropdown",
    Delete: "Delete Dropdown",
  }[formType];

  const isReadOnly = formType === "Delete";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        {errorMessage && (
          <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="ddtype">Type *</Label>
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={typeOpen}
                  className="w-full justify-between px-3"
                  disabled={isReadOnly}
                >
                  <span className="truncate">{ddtype || "Select Type..."}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search type..." />
                  <CommandEmpty>No type found.</CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-y-auto">
                    {ddtypeList.map((type, idx) => (
                      <CommandItem
                        key={`type-${idx}`}
                        value={type}
                        onSelect={(val) => {
                          setDdtype(val);
                          setTypeOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            ddtype === type ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {type}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Value Input */}
          <div className="space-y-2">
            <Label htmlFor="ddvalue">Value *</Label>
            <Input
              id="ddvalue"
              placeholder="Enter value"
              value={ddvalue}
              onChange={(e) => setDdvalue(e.target.value)}
              disabled={isReadOnly}
              className="bg-background text-foreground"
            />
          </div>

          {/* Buttons */}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isReadOnly}
              className={isReadOnly ? "bg-destructive text-destructive-foreground" : ""}
            >
              {isReadOnly ? "Confirm Delete" : formType}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
