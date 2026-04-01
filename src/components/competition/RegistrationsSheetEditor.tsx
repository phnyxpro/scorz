import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Save, X, Trash2, Copy, ClipboardPaste, ArrowUpDown, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { FormSchema, FormField } from "@/hooks/useRegistrationForm";
import { ContestantRegistration } from "@/hooks/useRegistrations";

interface RegistrationsSheetEditorProps {
  competitionId: string;
  registrations: ContestantRegistration[];
  formSchema: FormSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levels?: any[];
  subEvents?: any[];
  categories?: any[];
  timeSlots?: any[];
}

export function RegistrationsSheetEditor({
  competitionId,
  registrations,
  formSchema,
  open,
  onOpenChange,
  levels,
  subEvents,
  categories,
  timeSlots
}: RegistrationsSheetEditorProps) {
  const qc = useQueryClient();
  const [data, setData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colKey: string } | null>(null);

  // Define columns based on form schema and builtin fields
  const columns = useMemo(() => {
    const cols: { key: string; label: string; type: string; options?: any[] }[] = [
      { key: "full_name", label: "Full Name", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "phone" },
      { key: "age_category", label: "Age Category", type: "select", options: [{ label: "Adult", value: "adult" }, { label: "Minor", value: "minor" }] },
      { key: "status", label: "Status", type: "select", options: ["approved", "pending", "rejected", "no_show", "disqualified", "drop_out"].map(s => ({ label: s, value: s })) },
      { key: "sub_event_id", label: "Sub-Event", type: "select", options: subEvents?.map(se => ({ label: se.name, value: se.id })) || [] },
    ];

    const skipKeys = new Set(["full_name", "email", "phone", "__subevent_selector"]);
    formSchema.forEach(section => {
      section.fields.forEach(field => {
        if (!skipKeys.has(field.key)) {
          let fieldOptions = field.options?.map(o => ({ label: o.label, value: o.value }));
          
          // Populate dynamic selector options
          if (!fieldOptions || fieldOptions.length === 0) {
            if (field.type === "level_selector") {
              fieldOptions = levels?.map(l => ({ label: l.name, value: l.id }));
            } else if (field.type === "subevent_selector") {
              fieldOptions = subEvents?.map(se => ({ label: se.name, value: se.id }));
            } else if (field.type === "category_selector" || field.type === "subcategory_selector") {
              fieldOptions = categories?.map(c => ({ label: c.name, value: c.id }));
            } else if (field.type === "time_slot_selector") {
              fieldOptions = timeSlots?.map(s => ({ label: `${s.start_time} - ${s.end_time}`, value: s.id }));
            }
          }

          cols.push({ 
            key: field.key, 
            label: field.label, 
            type: (field.type.includes("_selector") || (fieldOptions && fieldOptions.length > 0)) ? "select" : field.type, 
            options: fieldOptions
          });
          skipKeys.add(field.key);
        }
      });
    });

    return cols;
  }, [formSchema, levels, subEvents, categories, timeSlots]);

  // Sync initial data when dialog opens
  useEffect(() => {
    if (open) {
      const formattedData = registrations.map(reg => ({
        id: reg.id,
        user_id: reg.user_id,
        full_name: reg.full_name,
        email: reg.email,
        phone: reg.phone,
        age_category: reg.age_category,
        status: reg.status,
        sub_event_id: reg.sub_event_id,
        sort_order: (reg as any).sort_order,
        ...((reg.custom_field_values as any) || {})
      }));
      setData(formattedData);
    }
  }, [open, registrations]);

  const handleValueChange = (rowIndex: number, key: string, value: any) => {
    setData(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [key]: value };
      return next;
    });
  };

  const handleAddRow = () => {
    const maxOrder = data.reduce((max, r) => Math.max(max, r.sort_order || 0), 0);
    setData(prev => [
      ...prev,
      { 
        full_name: "", 
        email: "", 
        phone: "", 
        age_category: "adult", 
        status: "approved",
        sort_order: maxOrder + 1
      }
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    setData(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePaste = async (e: React.ClipboardEvent, rowIndex: number, colKey: string) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    const rows = text.split(/\r?\n/).filter(r => r.length > 0).map(r => r.split("\t"));
    const startColIdx = columns.findIndex(c => c.key === colKey);
    
    if (startColIdx === -1) return;

    setData(prev => {
      const next = [...prev];
      rows.forEach((row, rIdx) => {
        const targetRowIdx = rowIndex + rIdx;
        
        // Add new row if it doesn't exist
        if (targetRowIdx >= next.length) {
          const maxOrder = next.reduce((max, r) => Math.max(max, r.sort_order || 0), 0);
          next.push({ 
            full_name: "", 
            email: "", 
            phone: "", 
            age_category: "adult", 
            status: "approved",
            sort_order: maxOrder + 1
          });
        }

        row.forEach((cell, cIdx) => {
          const targetColIdx = startColIdx + cIdx;
          if (targetColIdx < columns.length) {
            const col = columns[targetColIdx];
            const trimmed = cell.trim();
            let finalValue = trimmed;

            // Resolve name to ID if it's a select column
            if (col.type === "select" && col.options) {
              const matchedOption = col.options.find(
                opt => opt.label.toLowerCase() === trimmed.toLowerCase() || opt.value === trimmed
              );
              if (matchedOption) finalValue = matchedOption.value;
            }

            next[targetRowIdx] = { ...next[targetRowIdx], [col.key]: finalValue };
          }
        });
      });
      return next;
    });

    toast({ title: "Data pasted", description: `Applied ${rows.length} rows of data.` });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Basic validation
      const invalidRows = data.filter(r => !r.full_name || !r.email);
      if (invalidRows.length > 0) {
        toast({ 
          title: "Validation Error", 
          description: "Full Name and Email are required for all registrations.", 
          variant: "destructive" 
        });
        setIsSaving(false);
        return;
      }

      // Format data for Supabase
      const toUpsert = data.map(r => {
        const { id, user_id, full_name, email, phone, age_category, status, sub_event_id, sort_order, ...custom_field_values } = r;
        return {
          id: id || undefined,
          competition_id: competitionId,
          user_id: user_id || undefined, // Will be resolved by triggers or set manually
          full_name,
          email,
          phone,
          age_category,
          status,
          sub_event_id: sub_event_id || null,
          sort_order,
          custom_field_values
        };
      });

      // Split into updates and inserts to handle user_id resolving if needed
      // but standard upsert works if email uniqueness is handled or user_id is provided.
      const { error } = await supabase
        .from("contestant_registrations")
        .upsert(toUpsert as any);

      if (error) throw error;

      toast({ title: "Sheet saved successfully", description: `Synchronized ${toUpsert.length} registrations.` });
      qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error saving sheet", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardPaste className="h-5 w-5 text-primary" />
                Edit Registrations as Sheet
              </DialogTitle>
              <DialogDescription>
                Bulk edit, copy & paste directly from Excel or Google Sheets.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddRow} className="gap-1">
                <Plus className="h-4 w-4" /> Add Row
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
                <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="border border-border rounded-lg shadow-sm bg-card mb-4 min-w-full inline-block align-middle">
            <Table className="relative min-w-[2000px]">
              <TableHeader className="sticky top-0 bg-secondary/50 z-20 backdrop-blur-sm shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center sticky left-0 bg-secondary z-30">#</TableHead>
                  {columns.map(col => (
                    <TableHead key={col.key} className="min-w-[180px] text-xs font-bold whitespace-nowrap">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-12 sticky right-0 bg-secondary z-30"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rIdx) => (
                  <TableRow key={rIdx} className="group hover:bg-muted/30">
                    <TableCell className="text-center font-mono text-[10px] text-muted-foreground sticky left-0 bg-card group-hover:bg-muted/30 z-10 border-r border-border/50">
                      {rIdx + 1}
                    </TableCell>
                    {columns.map(col => (
                      <TableCell key={col.key} className="p-1 border-r border-border/50 last:border-0">
                        {col.type === "select" ? (
                          <Select 
                            value={String(row[col.key] || "")} 
                            onValueChange={(v) => handleValueChange(rIdx, col.key, v)}
                          >
                            <SelectTrigger className="h-8 border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border text-xs px-2 shadow-none focus:ring-0 transition-none">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {col.options?.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={String(row[col.key] || "")}
                            onChange={(e) => handleValueChange(rIdx, col.key, e.target.value)}
                            onPaste={(e) => handlePaste(e, rIdx, col.key)}
                            onFocus={() => setFocusedCell({ rowIndex: rIdx, colKey: col.key })}
                            className="h-8 border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border text-xs px-2 shadow-none focus:ring-0 transition-none rounded-none"
                            placeholder="—"
                          />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="p-1 sticky right-0 bg-card group-hover:bg-muted/30 z-10 border-l border-border/50">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveRow(rIdx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border-2 border-dashed border-border/30">
              <ClipboardPaste className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No data in sheet.</p>
              <Button variant="link" onClick={handleAddRow} className="mt-2 text-primary font-bold">Add first row</Button>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between sm:justify-between">
          <div className="text-[10px] text-muted-foreground italic flex items-center gap-4">
             <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted border rounded">TAB</kbd> Next Cell</span>
             <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted border rounded">Ctrl+V</kbd> Paste from Excel/Sheets</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save All Changes"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
