"use client";

import { fetchApi } from '@/lib/api';
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
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
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsersModalProps {
  open: boolean;
  onClose: () => void;
  formType: "Add" | "Edit" | "Delete";
  userId: number | null;
  initialData?: any;
  onSuccess: () => void;
}

interface DepartmentOption {
  id: number;
  ddtype: string;
  ddvalue: string;
}

const ROLE_OPTIONS = ["Admin", "User"];
const STATUS_OPTIONS = ["Active", "Inactive"];

export function UsersModal({
  open,
  onClose,
  formType,
  userId,
  initialData,
  onSuccess,
}: UsersModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [deptOpen, setDeptOpen] = useState(false);
  const [role, setRole] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [status, setStatus] = useState("Active");
  const [statusOpen, setStatusOpen] = useState(false);
  const [allDepartments, setAllDepartments] = useState<DepartmentOption[]>([]);

  // Fetch departments from master
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    fetchApi(`${API_BASE_URL}/api/master?id=1`)
      .then((res) => res.json())
      .then((data) => {
        const deptList = Array.isArray(data.departments) ? data.departments : [];
        setAllDepartments(deptList);
      })
      .catch((err) => {
        console.error("[v0] Error fetching departments:", err.message);
        setErrorMessage("Failed to load departments");
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Fetch user data for Edit
  useEffect(() => {
    if (!open || !userId || (formType !== "Edit" && formType !== "Delete")) return;

    if (initialData) {
      setName(initialData.name || "");
      setEmail(initialData.email || "");
      setRole(initialData.role || "");
      setStatus(initialData.userstatus || initialData.user_status || "Active");
      // Parse comma-separated departments
      const depts = (initialData.department || "")
        .split(",")
        .map((d: string) => d.trim())
        .filter((d: string) => d);
      setSelectedDepts(depts);
      return;
    }

    setLoading(true);
    fetchApi(`${API_BASE_URL}/api/userdata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId }),
    })
      .then((res) => res.json())
      .then((data) => {
        const record = data.data?.[0];
        if (record) {
          setName(record.name || "");
          setEmail(record.email || "");
          setRole(record.role || "");
          setStatus(record.userstatus || "Active");
          // Parse comma-separated departments
          const depts = (record.department || "")
            .split(",")
            .map((d: string) => d.trim())
            .filter((d: string) => d);
          setSelectedDepts(depts);
        }
      })
      .catch((err) => {
        console.error("[v0] Error fetching user:", err.message);
        setErrorMessage("Failed to load user data");
      })
      .finally(() => setLoading(false));
  }, [open, userId, formType, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (formType === "Add") {
      if (!name || !email || selectedDepts.length === 0 || !role) {
        setErrorMessage("Please fill in all required fields");
        return;
      }
    }

    setLoading(true);
    try {
      const payload =
        formType === "Edit"
          ? {
              id: userId,
              department: selectedDepts.join(", "),
              role,
              userstatus: status,
            }
          : {
              name,
              email,
              department: selectedDepts.join(", "),
              role,
            };

      const res = await fetchApi(`${API_BASE_URL}/api/userdataupdate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMessage = responseData.error || `HTTP ${res.status}`;
        throw new Error(errorMessage);
      }

      onSuccess();
      onClose();
      setName("");
      setEmail("");
      setSelectedDepts([]);
      setRole("");
      setStatus("Active");
    } catch (err) {
      console.error("[v0] Error submitting form:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to submit form. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeptToggle = (dept: string) => {
    setSelectedDepts((prev) => {
      // If selecting "All Departments"
      if (dept === "All Departments") {
        if (prev.includes("All Departments")) {
          return prev.filter((d) => d !== "All Departments");
        } else {
          return ["All Departments"];
        }
      }
      
      // If selecting a specific department
      const updated = prev.includes(dept) 
        ? prev.filter((d) => d !== dept) 
        : [...prev, dept];
      
      // Remove "All Departments" if any specific department is selected
      return updated.filter((d) => d !== "All Departments");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formType === "Add" ? "Add User" : "Edit User"}
          </DialogTitle>
          <DialogDescription>
            {formType === "Add"
              ? "Create a new user account"
              : "Update user information"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                disabled={formType === "Edit"}
                className="bg-background"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                disabled={formType === "Edit"}
                className="bg-background"
              />
            </div>

            {/* Department - Multi-select */}
            <div className="space-y-2">
              <Label>Department</Label>
              <div className="flex flex-wrap gap-2 p-2 bg-background border border-border rounded min-h-10">
                {selectedDepts.length > 0 ? (
                  selectedDepts.map((dept) => (
                    <div
                      key={dept}
                      className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded text-sm"
                    >
                      <span>{dept}</span>
                      <button
                        type="button"
                        onClick={() => handleDeptToggle(dept)}
                        className="ml-1 hover:opacity-70"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Select departments...</span>
                )}
              </div>
              <Popover open={deptOpen} onOpenChange={setDeptOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Add Department
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search departments..." />
                    <CommandEmpty>No department found.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {/* All Departments option */}
                      <CommandItem
                        key="all-departments"
                        value="All Departments"
                        onSelect={() => {
                          if (selectedDepts.includes("All Departments")) {
                            setSelectedDepts([]);
                          } else {
                            setSelectedDepts(["All Departments"]);
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedDepts.includes("All Departments")
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        All Departments
                      </CommandItem>
                      {allDepartments
                        .filter((d) => d.ddtype === "department")
                        .map((dept, idx) => (
                          <CommandItem
                            key={`dept-${idx}`}
                            value={dept.ddvalue}
                            onSelect={() => handleDeptToggle(dept.ddvalue)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDepts.includes(dept.ddvalue)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {dept.ddvalue}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Role - Tom Select style dropdown */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Popover open={roleOpen} onOpenChange={setRoleOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="truncate">{role || "Select role..."}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search roles..." />
                    <CommandEmpty>No role found.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {ROLE_OPTIONS.map((r) => (
                        <CommandItem
                          key={r}
                          value={r}
                          onSelect={(val) => {
                            setRole(role === val ? "" : val);
                            setRoleOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              role === r ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {r}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Status - only in Edit mode */}
            {formType === "Edit" && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="truncate">{status || "Select status..."}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search status..." />
                      <CommandEmpty>No status found.</CommandEmpty>
                      <CommandGroup>
                        {STATUS_OPTIONS.map((s) => (
                          <CommandItem
                            key={s}
                            value={s}
                            onSelect={(val) => {
                              setStatus(val);
                              setStatusOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                status === s ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {s}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>{formType === "Edit" ? "Update" : "Create"}</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
