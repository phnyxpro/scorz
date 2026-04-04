import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Save, X, Trash2, Copy, ClipboardPaste, ArrowUpDown, History, GripVertical, Undo2, Redo2, Upload, ChevronDown, ChevronRight, FileSpreadsheet, ArrowRight, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { readXLSXToJson } from "@/lib/export-utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
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
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[][]>([]);
  const [redoStack, setRedoStack] = useState<any[][]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colKey: string } | null>(null);

  // Upload wizard state
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [uploadHeaders, setUploadHeaders] = useState<string[]>([]);
  const [uploadRows, setUploadRows] = useState<Record<string, any>[]>([]);
  const [uploadMapping, setUploadMapping] = useState<Record<string, string>>({});
  const [uploadSubEventId, setUploadSubEventId] = useState<string>("");
  const [uploadLevelId, setUploadLevelId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-cell selection state
  const [selectionStart, setSelectionStart] = useState<{ r: number; c: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ r: number; c: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Define columns based on form schema and builtin fields
  const columns = useMemo(() => {
    const isCategoryEvent = levels?.some((l: any) => l.structure_type === "categories");
    const cols: { key: string; label: string; type: string; options?: any[] }[] = [
      { key: "full_name", label: "Full Name", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "phone" },
    ];
    
    if (!isCategoryEvent) {
      cols.push({ key: "age_category", label: "Age Category", type: "select", options: [{ label: "Adult", value: "adult" }, { label: "Minor", value: "minor" }] });
    }

    cols.push({ key: "status", label: "Status", type: "select", options: ["approved", "pending", "rejected", "no_show", "disqualified", "drop_out"].map(s => ({ label: s, value: s })) });

    if (!isCategoryEvent) {
      cols.push({ key: "sub_event_id", label: "Sub-Event", type: "select", options: subEvents?.map(se => ({ label: se.name, value: se.id })) || [] });
    }

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
            } else if (
              field.type === "category_selector" || 
              field.type === "subcategory_selector" ||
              field.key.includes("category") ||
              field.label.toLowerCase().includes("category") ||
              field.label.toLowerCase().includes("division") ||
              field.label.toLowerCase().includes("group")
            ) {
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
      setData(prev => {
        // If we already have data, we want to keep current rows and just update values 
        // OR reconcile with the new registrations from parent without resetting everything.
        // For simplicity, we only initialize when data is empty or dialog just opened.
        if (prev.length > 0 && registrations.length > 0 && prev.some(r => r.id)) return prev;

        const formatted = registrations.map(reg => ({
          id: reg.id,
          temp_id: reg.id || crypto.randomUUID(),
          user_id: reg.user_id,
          full_name: reg.full_name,
          email: reg.email,
          phone: reg.phone,
          age_category: reg.age_category,
          status: reg.status,
          sub_event_id: reg.sub_event_id,
          sort_order: (reg as any).sort_order || 0,
          ...((reg.custom_field_values as any) || {})
        }));
        
        formatted.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        return formatted;
      });
    }
  }, [open, registrations]);

  const recordChange = (currentData: any[]) => {
    setHistory(prev => [...prev.slice(-49), currentData]); // Limit to 50 steps
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setRedoStack(prev => [...prev, data]);
    setHistory(prev => prev.slice(0, -1));
    setData(lastState);
    toast({ title: "Undo", description: "Reverted last change." });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, data]);
    setRedoStack(prev => prev.slice(0, -1));
    setData(nextState);
    toast({ title: "Redo", description: "Restored change." });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "z") {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, history, redoStack, data]);

  // Selection Logic
  const handleCellMouseDown = (r: number, c: number) => {
    setSelectionStart({ r, c });
    setSelectionEnd({ r, c });
    setIsSelecting(true);
  };

  const handleCellMouseOver = (r: number, c: number) => {
    if (isSelecting) {
      setSelectionEnd({ r, c });
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsSelecting(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        // Clear selected range
        if (selectionStart && selectionEnd) {
          recordChange(data);
          const rStart = Math.min(selectionStart.r, selectionEnd.r);
          const rEnd = Math.max(selectionStart.r, selectionEnd.r);
          const cStart = Math.min(selectionStart.c, selectionEnd.c);
          const cEnd = Math.max(selectionStart.c, selectionEnd.c);

          setData(prev => {
            const next = [...prev];
            for (let r = rStart; r <= rEnd; r++) {
              for (let c = cStart; c <= cEnd; c++) {
                const colKey = columns[c].key;
                next[r] = { ...next[r], [colKey]: "" };
              }
            }
            return next;
          });
          toast({ title: "Selection cleared" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isSelecting, selectionStart, selectionEnd, data, columns]);

  const isCellSelected = (r: number, c: number) => {
    if (!selectionStart || !selectionEnd) return false;
    const rStart = Math.min(selectionStart.r, selectionEnd.r);
    const rEnd = Math.max(selectionStart.r, selectionEnd.r);
    const cStart = Math.min(selectionStart.c, selectionEnd.c);
    const cEnd = Math.max(selectionStart.c, selectionEnd.c);
    return r >= rStart && r <= rEnd && c >= cStart && c <= cEnd;
  };

  const handleValueChange = (rowIndex: number, key: string, value: any) => {
    recordChange(data);
    setData(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [key]: value };
      return next;
    });
  };

  const handleAddRow = () => {
    recordChange(data);
    const maxOrder = data.reduce((max, r) => Math.max(max, r.sort_order || 0), 0);
    setData(prev => [
      ...prev,
      { 
        id: null,
        temp_id: crypto.randomUUID(),
        user_id: user?.id,
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
    recordChange(data);
    setData(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePaste = async (e: React.ClipboardEvent, rowIndex: number, colKey: string) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    recordChange(data);
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
            id: null,
            temp_id: crypto.randomUUID(),
            user_id: user?.id,
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
                opt => opt.label.toLowerCase() === trimmed.toLowerCase() || String(opt.value).toLowerCase() === trimmed.toLowerCase()
              );
              if (matchedOption) {
                finalValue = matchedOption.value;
              } else {
                // If it doesn't strictly match and the user wants to paste arbitrary values, we allow it.
                finalValue = trimmed;
              }
            }

            next[targetRowIdx] = { ...next[targetRowIdx], [col.key]: finalValue };
          }
        });
      });
      return next;
    });

    toast({ title: "Data pasted", description: `Applied ${rows.length} rows of data.` });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    recordChange(data);
    setData((prev) => {
      const oldIndex = prev.findIndex((r) => String(r.temp_id) === String(active.id));
      const newIndex = prev.findIndex((r) => String(r.temp_id) === String(over.id));
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newData = arrayMove(prev, oldIndex, newIndex);
      
      // Update sort_order for ALL rows to match the new visual order
      return newData.map((row, idx) => ({
        ...row,
        sort_order: idx
      }));
    });
  };

  // ─── Upload Wizard Helpers ───────────────────────────
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const filteredSubEventsForUpload = useMemo(() => {
    if (!uploadLevelId) return subEvents || [];
    return (subEvents || []).filter((se: any) => se.level_id === uploadLevelId);
  }, [uploadLevelId, subEvents]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let rows: Record<string, any>[] = [];

      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { toast({ title: "Empty file", variant: "destructive" }); return; }
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine);
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          const obj: Record<string, any> = {};
          headers.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
          rows.push(obj);
        }
      } else {
        const buffer = await file.arrayBuffer();
        rows = await readXLSXToJson(buffer);
      }

      if (rows.length === 0) { toast({ title: "No data found in file", variant: "destructive" }); return; }

      const headers = Object.keys(rows[0]);
      setUploadHeaders(headers);
      setUploadRows(rows);

      // Auto-map columns via fuzzy match
      const mapping: Record<string, string> = {};
      headers.forEach(h => {
        const nh = normalize(h);
        const matched = columns.find(col => {
          const nl = normalize(col.label);
          const nk = normalize(col.key);
          return nl === nh || nk === nh || nl.includes(nh) || nh.includes(nl);
        });
        if (matched) mapping[h] = matched.key;
      });
      setUploadMapping(mapping);
      setUploadStep(2);
      toast({ title: "File parsed", description: `${rows.length} rows, ${headers.length} columns detected.` });
    } catch (err: any) {
      toast({ title: "Failed to parse file", description: err.message, variant: "destructive" });
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { result.push(current.trim()); current = ""; }
        else current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const mappedCount = Object.values(uploadMapping).filter(v => v).length;

  const handleUploadMerge = () => {
    if (uploadRows.length === 0) return;
    recordChange(data);
    const maxOrder = data.reduce((max, r) => Math.max(max, r.sort_order || 0), 0);

    const newRows = uploadRows.map((uRow, idx) => {
      const row: any = {
        id: null,
        temp_id: crypto.randomUUID(),
        user_id: user?.id,
        full_name: "",
        email: "",
        phone: "",
        age_category: "adult",
        status: "approved",
        sub_event_id: uploadSubEventId || null,
        sort_order: maxOrder + 1 + idx,
      };

      Object.entries(uploadMapping).forEach(([csvHeader, colKey]) => {
        if (!colKey) return;
        const rawValue = String(uRow[csvHeader] ?? "").trim();
        const col = columns.find(c => c.key === colKey);

        if (col?.type === "select" && col.options) {
          const matched = col.options.find(
            (opt: any) => opt.label.toLowerCase() === rawValue.toLowerCase() || String(opt.value).toLowerCase() === rawValue.toLowerCase()
          );
          row[colKey] = matched ? matched.value : rawValue;
        } else {
          row[colKey] = rawValue;
        }
      });

      return row;
    });

    setData(prev => [...prev, ...newRows]);
    toast({ title: "Rows imported", description: `${newRows.length} rows added to sheet.` });
    // Reset upload state
    setShowUploadPanel(false);
    setUploadStep(1);
    setUploadHeaders([]);
    setUploadRows([]);
    setUploadMapping({});
    setUploadSubEventId("");
    setUploadLevelId("");
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
      const toUpsert = data.map((r, idx) => {
        const { id, temp_id, user_id, full_name, email, phone, age_category, status, sub_event_id, ...custom_field_values } = r;
        return {
          id: id || undefined,
          competition_id: competitionId,
          user_id: user_id || user?.id,
          full_name,
          email,
          phone,
          age_category,
          status,
          sub_event_id: sub_event_id || null,
          sort_order: idx, // Ensure sort_order is based on final position
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
              <div className="flex items-center border rounded-md px-1 mr-2 bg-muted/30">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleUndo} 
                  disabled={history.length === 0}
                  className="h-8 w-8"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <div className="w-[1px] h-4 bg-border mx-0.5" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRedo} 
                  disabled={redoStack.length === 0}
                  className="h-8 w-8"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setShowUploadPanel(p => !p); setUploadStep(1); }} className="gap-1">
                <Upload className="h-4 w-4" /> Upload
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" onClick={handleAddRow} className="gap-1">
                <Plus className="h-4 w-4" /> Add Row
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
                <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Upload Wizard Panel */}
        {showUploadPanel && (
          <div className="mx-6 mb-2 border border-border rounded-lg bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Upload File — Step {uploadStep} of 3
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowUploadPanel(false); setUploadStep(1); setUploadHeaders([]); setUploadRows([]); setUploadMapping({}); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {uploadStep === 1 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
                    <Upload className="h-4 w-4" /> Choose File (CSV / XLSX)
                  </Button>
                </div>
                {(levels && levels.length > 0) && (
                  <div className="grid grid-cols-2 gap-3 max-w-lg">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Level (optional)</label>
                      <Select value={uploadLevelId || "__none__"} onValueChange={v => { setUploadLevelId(v === "__none__" ? "" : v); setUploadSubEventId(""); }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All levels" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs">— All —</SelectItem>
                          {levels.map((l: any) => <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Sub-Event (optional)</label>
                      <Select value={uploadSubEventId || "__none__"} onValueChange={v => setUploadSubEventId(v === "__none__" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs">— None —</SelectItem>
                          {filteredSubEventsForUpload.map((se: any) => <SelectItem key={se.id} value={se.id} className="text-xs">{se.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">Upload a file first, then map columns in the next step.</p>
              </div>
            )}

            {uploadStep === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Map your file columns to sheet columns. <span className="font-medium text-foreground">{mappedCount}/{uploadHeaders.length}</span> mapped.</p>
                <ScrollArea className="max-h-[200px] border rounded-md bg-card">
                  <div className="divide-y divide-border">
                    {uploadHeaders.map(h => (
                      <div key={h} className="flex items-center gap-3 px-3 py-1.5">
                        <span className="text-xs font-mono w-[180px] truncate" title={h}>{h}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Select value={uploadMapping[h] || "__skip__"} onValueChange={v => setUploadMapping(prev => ({ ...prev, [h]: v === "__skip__" ? "" : v }))}>
                          <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__" className="text-xs text-muted-foreground">— Skip —</SelectItem>
                            {columns.map(col => <SelectItem key={col.key} value={col.key} className="text-xs">{col.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {uploadMapping[h] && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setUploadStep(1)}>Back</Button>
                  <Button size="sm" onClick={() => setUploadStep(3)} disabled={mappedCount === 0}>Next — Preview</Button>
                </div>
              </div>
            )}

            {uploadStep === 3 && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span><strong>{uploadRows.length}</strong> rows to import</span>
                  <span><strong>{mappedCount}</strong> columns mapped</span>
                  {uploadSubEventId && <span className="text-xs text-muted-foreground">Sub-event: {(subEvents || []).find((se: any) => se.id === uploadSubEventId)?.name || "—"}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setUploadStep(2)}>Back</Button>
                  <Button size="sm" onClick={handleUploadMerge} className="gap-1">
                    <Plus className="h-4 w-4" /> Add {uploadRows.length} Rows to Sheet
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="border border-border rounded-lg shadow-sm bg-card mb-4 min-w-full inline-block align-middle">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <Table className="relative min-w-[2000px]">
                <TableHeader className="sticky top-0 bg-secondary/50 z-20 backdrop-blur-sm shadow-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-center sticky left-0 bg-secondary z-30"></TableHead>
                    <TableHead className="w-12 text-center sticky left-0 bg-secondary z-30 ml-10 border-l">#</TableHead>
                    {columns.map(col => (
                      <TableHead key={col.key} className="min-w-[180px] text-xs font-bold whitespace-nowrap">
                        {col.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-12 sticky right-0 bg-secondary z-30"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={data.map(r => r.temp_id)} strategy={verticalListSortingStrategy}>
                    {data.map((row, rIdx) => (
                      <SortableTableRow 
                        key={row.temp_id}
                        row={row} 
                        rIdx={rIdx} 
                        columns={columns} 
                        handleValueChange={handleValueChange}
                        handlePaste={handlePaste}
                        handleRemoveRow={handleRemoveRow}
                        setFocusedCell={setFocusedCell}
                        selectionRange={{ start: selectionStart, end: selectionEnd }}
                        onCellMouseDown={handleCellMouseDown}
                        onCellMouseOver={handleCellMouseOver}
                        isCellSelected={isCellSelected}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
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
             <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted border rounded">Ctrl+Z/Y</kbd> Undo/Redo</span>
             <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted border rounded">DEL</kbd> Clear Selection</span>
             <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted border rounded">Shift+Click</kbd> Multi-select</span>
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

// ─── Sortable Table Row Component ───────────────────────────

interface SortableTableRowProps {
  row: any;
  rIdx: number;
  columns: any[];
  handleValueChange: (rIdx: number, key: string, val: any) => void;
  handlePaste: (e: React.ClipboardEvent, rIdx: number, key: string) => void;
  handleRemoveRow: (idx: number) => void;
  setFocusedCell: (cell: { rowIndex: number; colKey: string } | null) => void;
  selectionRange: { start: any; end: any };
  onCellMouseDown: (rIdx: number, cIdx: number) => void;
  onCellMouseOver: (rIdx: number, cIdx: number) => void;
  isCellSelected: (rIdx: number, cIdx: number) => boolean;
}

function SortableTableRow({ 
  row, 
  rIdx, 
  columns, 
  handleValueChange, 
  handlePaste, 
  handleRemoveRow, 
  setFocusedCell,
  onCellMouseDown,
  onCellMouseOver,
  isCellSelected
}: SortableTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: row.temp_id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: "relative" as const,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={`group hover:bg-muted/30 ${isDragging ? "bg-muted shadow-lg" : ""}`}
    >
      <TableCell 
        className="w-10 text-center p-0 sticky left-0 bg-card group-hover:bg-muted/30 z-20 border-r border-border/50"
      >
        <div 
          className="flex items-center justify-center h-full w-10 cursor-grab active:cursor-grabbing outline-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors" />
        </div>
      </TableCell>
      <TableCell className="text-center font-mono text-[10px] text-muted-foreground sticky left-10 bg-card group-hover:bg-muted/30 z-10 border-r border-border/50 w-12">
        {rIdx + 1}
      </TableCell>
      {columns.map((col, cIdx) => (
        <TableCell 
          key={col.key} 
          className={`p-0 border-r border-border/50 last:border-0 relative ${isCellSelected(rIdx, cIdx) ? "bg-primary/10" : ""}`}
          onMouseDown={() => onCellMouseDown(rIdx, cIdx)}
          onMouseOver={() => onCellMouseOver(rIdx, cIdx)}
          tabIndex={0}
          onPaste={(e) => handlePaste(e, rIdx, col.key)}
          onFocus={() => {
            if (col.type === "select" || Array.isArray(row[col.key])) {
              setFocusedCell({ rowIndex: rIdx, colKey: col.key });
              onCellMouseDown(rIdx, cIdx);
            }
          }}
        >
          {isCellSelected(rIdx, cIdx) && (
            <div className="absolute inset-0 border-2 border-primary pointer-events-none z-10" />
          )}
          {col.type === "select" ? (
            <Select 
              value={String(row[col.key] || "__none__")} 
              onValueChange={(v) => handleValueChange(rIdx, col.key, v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="h-8 border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border text-xs px-2 shadow-none focus:ring-0 transition-none w-full outline-none">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-muted-foreground">— None —</SelectItem>
                {col.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
                {row[col.key] && (!col.options || !col.options.some(o => String(o.value) === String(row[col.key]) || String(o.label) === String(row[col.key]))) && (
                  <SelectItem key={row[col.key]} value={row[col.key]} className="text-xs">{row[col.key]}</SelectItem>
                )}
              </SelectContent>
            </Select>
          ) : Array.isArray(row[col.key]) ? (
            <div 
              className="h-8 flex items-center px-2 text-xs text-muted-foreground truncate border-transparent bg-transparent cursor-not-allowed"
              title="Complex fields must be edited in the form"
              onMouseDown={() => {
                setFocusedCell({ rowIndex: rIdx, colKey: col.key });
                onCellMouseDown(rIdx, cIdx);
              }}
              onMouseOver={() => onCellMouseOver(rIdx, cIdx)}
            >
              {row[col.key].length > 0 && typeof row[col.key][0] === "object"
                ? row[col.key].map((item: any) => Object.values(item).filter(v => v).join(" - ")).join(", ")
                : row[col.key].join(", ")}
            </div>
          ) : (
            <Input
              value={String(row[col.key] || "")}
              onChange={(e) => handleValueChange(rIdx, col.key, e.target.value)}
              onPaste={(e) => handlePaste(e, rIdx, col.key)}
              onFocus={() => {
                setFocusedCell({ rowIndex: rIdx, colKey: col.key });
                onCellMouseDown(rIdx, cIdx); // Focus also starts single cell selection
              }}
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
  );
}
