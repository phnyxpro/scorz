import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronRight, ChevronDown, FolderTree, Link2, Download, Pencil, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import { CategoryLevelSettings, DEFAULT_SETTINGS } from "@/components/competition/CategoryLevelSettings";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Category {
  id: string;
  level_id: string;
  parent_id: string | null;
  sub_event_id: string | null;
  name: string;
  color: string | null;
  sort_order: number;
}

function useCategories(levelId: string) {
  return useQuery({
    queryKey: ["competition_categories", levelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_categories")
        .select("*")
        .eq("level_id", levelId)
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });
}

function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { level_id: string; parent_id: string | null; name: string; sort_order: number }) => {
      // Create the category
      const { data: cat, error } = await supabase
        .from("competition_categories")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return cat as Category;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["competition_categories", v.level_id] });
      toast({ title: "Category added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

function useRenameCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, level_id, name }: { id: string; level_id: string; name: string }) => {
      const { error } = await supabase.from("competition_categories").update({ name }).eq("id", id);
      if (error) throw error;
      return level_id;
    },
    onSuccess: (lid) => {
      qc.invalidateQueries({ queryKey: ["competition_categories", lid] });
      toast({ title: "Category renamed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

function useReorderCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ updates, level_id }: { updates: { id: string; sort_order: number }[]; level_id: string }) => {
      for (const u of updates) {
        const { error } = await supabase.from("competition_categories").update({ sort_order: u.sort_order }).eq("id", u.id);
        if (error) throw error;
      }
      return level_id;
    },
    onSuccess: (lid) => {
      qc.invalidateQueries({ queryKey: ["competition_categories", lid] });
    },
    onError: (e: any) => toast({ title: "Error reordering", description: e.message, variant: "destructive" }),
  });
}

function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, level_id, sub_event_id }: { id: string; level_id: string; sub_event_id: string | null }) => {
      const { error } = await supabase.from("competition_categories").delete().eq("id", id);
      if (error) throw error;
      if (sub_event_id) {
        await supabase.from("sub_events").delete().eq("id", sub_event_id);
      }
      return level_id;
    },
    onSuccess: (lid) => {
      qc.invalidateQueries({ queryKey: ["competition_categories", lid] });
      qc.invalidateQueries({ queryKey: ["sub_events"] });
      toast({ title: "Category deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

function useLinkSubEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, levelId, fullPath }: { categoryId: string; levelId: string; fullPath: string }) => {
      // Fetch current level settings from an existing linked sub_event
      const { data: existing } = await supabase
        .from("sub_events")
        .select("location, is_virtual, event_date, start_time, end_time, voting_enabled, use_time_slots, ticketing_type, ticket_price, max_tickets, external_ticket_url")
        .eq("level_id", levelId)
        .limit(1)
        .maybeSingle();

      const insertPayload: Record<string, any> = {
        level_id: levelId,
        name: fullPath,
      };
      if (existing) {
        insertPayload.location = existing.location;
        insertPayload.is_virtual = (existing as any).is_virtual;
        insertPayload.event_date = existing.event_date;
        insertPayload.start_time = existing.start_time;
        insertPayload.end_time = existing.end_time;
        insertPayload.voting_enabled = existing.voting_enabled;
        insertPayload.use_time_slots = existing.use_time_slots;
        insertPayload.ticketing_type = existing.ticketing_type;
        insertPayload.ticket_price = existing.ticket_price;
        insertPayload.max_tickets = existing.max_tickets;
        insertPayload.external_ticket_url = existing.external_ticket_url;
      }

      // Create a sub_event for this leaf category
      const { data: se, error: seErr } = await supabase
        .from("sub_events")
        .insert(insertPayload as any)
        .select()
        .single();
      if (seErr) throw seErr;
      // Link it to the category
      const { error } = await supabase
        .from("competition_categories")
        .update({ sub_event_id: se.id })
        .eq("id", categoryId);
      if (error) throw error;
      return { categoryId, subEventId: se.id, levelId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["competition_categories", r.levelId] });
      qc.invalidateQueries({ queryKey: ["sub_events", r.levelId] });
    },
    onError: (e: any) => toast({ title: "Error linking sub-event", description: e.message, variant: "destructive" }),
  });
}

function buildTree(categories: Category[]): Map<string | null, Category[]> {
  const map = new Map<string | null, Category[]>();
  for (const cat of categories) {
    const parentKey = cat.parent_id;
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey)!.push(cat);
  }
  return map;
}

function getFullPath(categories: Category[], catId: string): string {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return "";
  if (!cat.parent_id) return cat.name;
  return getFullPath(categories, cat.parent_id) + " > " + cat.name;
}

function CategoryNode({
  cat,
  allCategories,
  tree,
  levelId,
  depth,
  onCreate,
  onDelete,
  onLink,
  onRename,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  cat: Category;
  allCategories: Category[];
  tree: Map<string | null, Category[]>;
  levelId: string;
  depth: number;
  onCreate: (parentId: string, name: string) => void;
  onDelete: (cat: Category) => void;
  onLink: (cat: Category) => void;
  onRename: (cat: Category, newName: string) => void;
  onMoveUp: (cat: Category) => void;
  onMoveDown: (cat: Category) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cat.name);
  const children = tree.get(cat.id) || [];
  const isLeaf = children.length === 0;

  const handleAdd = () => {
    if (!newName.trim()) return;
    onCreate(cat.id, newName.trim());
    setNewName("");
    setAdding(false);
  };

  const handleRenameSubmit = () => {
    if (!editName.trim() || editName.trim() === cat.name) {
      setEditing(false);
      setEditName(cat.name);
      return;
    }
    onRename(cat, editName.trim());
    setEditing(false);
  };

  return (
    <div className={cn("border-l border-border/40", depth > 0 && "ml-4")}>
      <div className="flex items-center gap-1.5 py-1 px-2 hover:bg-muted/30 rounded-sm group">
        {!isLeaf ? (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}

        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-6 text-xs flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") { setEditing(false); setEditName(cat.name); }
              }}
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={handleRenameSubmit}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(false); setEditName(cat.name); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-sm font-medium text-foreground flex-1 cursor-pointer" onDoubleClick={() => { setEditing(true); setEditName(cat.name); }}>
            {cat.name}
          </span>
        )}

        {!editing && isLeaf && cat.sub_event_id && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <Link2 className="h-2.5 w-2.5" /> Linked
          </Badge>
        )}
        {!editing && isLeaf && !cat.sub_event_id && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => onLink(cat)}>
            <Link2 className="h-3 w-3 mr-1" /> Link Sub-Event
          </Button>
        )}
        {!editing && children.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{children.length}</Badge>
        )}

        {/* Reorder arrows */}
        {!editing && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground"
              onClick={() => onMoveUp(cat)}
              disabled={isFirst}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground"
              onClick={() => onMoveDown(cat)}
              disabled={isLast}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </>
        )}

        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground"
            onClick={() => { setEditing(true); setEditName(cat.name); }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-primary"
            onClick={() => setAdding(!adding)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
            onClick={() => onDelete(cat)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex gap-1.5 ml-8 my-1">
          <Input
            placeholder="Sub-category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs px-2" onClick={handleAdd} disabled={!newName.trim()}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setAdding(false)}>
            ✕
          </Button>
        </div>
      )}

      {expanded && children.map((child, idx) => (
        <CategoryNode
          key={child.id}
          cat={child}
          allCategories={allCategories}
          tree={tree}
          levelId={levelId}
          depth={depth + 1}
          onCreate={onCreate}
          onDelete={onDelete}
          onLink={onLink}
          onRename={onRename}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          isFirst={idx === 0}
          isLast={idx === children.length - 1}
        />
      ))}
    </div>
  );
}

export function CategoriesPanel({ levelId, competitionId }: { levelId: string; competitionId?: string }) {
  const { data: categories } = useCategories(levelId);
  const createCat = useCreateCategory();
  const deleteCat = useDeleteCategory();
  const renameCat = useRenameCategory();
  const reorderCat = useReorderCategory();
  const linkSE = useLinkSubEvent();
  const qc = useQueryClient();
  const [newRootName, setNewRootName] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSource, setImportSource] = useState<{ id: string; name: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const tree = buildTree(categories || []);
  const rootCategories = tree.get(null) || [];

  const handleCreate = (parentId: string | null, name: string) => {
    const siblings = parentId ? (tree.get(parentId) || []) : rootCategories;
    createCat.mutate({
      level_id: levelId,
      parent_id: parentId,
      name,
      sort_order: siblings.length,
    });
  };

  const handleDelete = (cat: Category) => {
    deleteCat.mutate({ id: cat.id, level_id: levelId, sub_event_id: cat.sub_event_id });
  };

  const handleLink = (cat: Category) => {
    const fullPath = getFullPath(categories || [], cat.id);
    linkSE.mutate({ categoryId: cat.id, levelId, fullPath });
  };

  const handleAddRoot = () => {
    if (!newRootName.trim()) return;
    handleCreate(null, newRootName.trim());
    setNewRootName("");
  };

  // Find previous level with categories for import
  const handleImportClick = async () => {
    if (!competitionId) return;
    const { data: allLevels } = await supabase
      .from("competition_levels")
      .select("id, name, sort_order, structure_type")
      .eq("competition_id", competitionId)
      .order("sort_order");
    if (!allLevels) return;

    // Find current level's sort_order
    const currentLevel = allLevels.find((l) => l.id === levelId);
    if (!currentLevel) return;

    // Scan backwards for levels with categories
    for (let i = allLevels.length - 1; i >= 0; i--) {
      const lvl = allLevels[i];
      if (lvl.id === levelId) continue;
      if ((lvl as any).structure_type === "categories") {
        const { data: cats } = await supabase
          .from("competition_categories")
          .select("id")
          .eq("level_id", lvl.id)
          .limit(1);
        if (cats && cats.length > 0) {
          setImportSource({ id: lvl.id, name: lvl.name });
          setImportDialogOpen(true);
          return;
        }
      }
    }
    toast({ title: "No categories to import", description: "No other level has a category structure set up yet." });
  };

  const handleImportConfirm = async () => {
    if (!importSource) return;
    setImporting(true);
    try {
      const { data: sourceCats, error } = await supabase
        .from("competition_categories")
        .select("*")
        .eq("level_id", importSource.id)
        .order("sort_order");
      if (error) throw error;
      if (!sourceCats?.length) return;

      const idMap = new Map<string, string>();
      const remaining = [...sourceCats];
      let maxPasses = 10;
      while (remaining.length > 0 && maxPasses-- > 0) {
        const stillRemaining: typeof remaining = [];
        for (const cat of remaining) {
          const newParentId = cat.parent_id ? idMap.get(cat.parent_id) || null : null;
          if (cat.parent_id && !newParentId) {
            stillRemaining.push(cat);
            continue;
          }
          const { data: newCat, error: insertErr } = await supabase
            .from("competition_categories")
            .insert({
              level_id: levelId,
              parent_id: newParentId,
              name: cat.name,
              color: cat.color,
              sort_order: cat.sort_order,
            })
            .select()
            .single();
          if (insertErr) throw insertErr;
          idMap.set(cat.id, newCat.id);
        }
        remaining.length = 0;
        remaining.push(...stillRemaining);
      }

      qc.invalidateQueries({ queryKey: ["competition_categories", levelId] });
      toast({ title: "Categories imported", description: `${idMap.size} categories imported from "${importSource.name}".` });
    } catch (e: any) {
      toast({ title: "Error importing categories", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      setImportDialogOpen(false);
      setImportSource(null);
    }
  };

  return (
    <div className="pl-4 border-l border-border/50 space-y-3 mt-3">
      <CategoryLevelSettings levelId={levelId} />
      <div className="flex gap-2">
        <Input
          placeholder="New category (e.g. Hip Hop, Classical)"
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
          className="h-8 text-xs"
          onKeyDown={(e) => e.key === "Enter" && handleAddRoot()}
        />
        <Button size="sm" variant="outline" onClick={handleAddRoot} disabled={!newRootName.trim() || createCat.isPending} className="h-8 text-xs shrink-0">
          <Plus className="h-3 w-3 mr-1" /> Add Category
        </Button>
        {competitionId && (
          <Button size="sm" variant="outline" onClick={handleImportClick} className="h-8 text-xs shrink-0">
            <Download className="h-3 w-3 mr-1" /> Import from Level
          </Button>
        )}
      </div>

      {rootCategories.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No categories yet. Add your first category above.</p>
          <p className="text-xs mt-1">e.g. "Solos", "Groups", "Hip Hop", "Classical"</p>
        </div>
      )}

      {rootCategories.map((cat) => (
        <CategoryNode
          key={cat.id}
          cat={cat}
          allCategories={categories || []}
          tree={tree}
          levelId={levelId}
          depth={0}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onLink={handleLink}
        />
      ))}

      {(categories || []).length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Leaf categories (no children) are automatically linked to sub-events for scoring.
        </p>
      )}

      <AlertDialog open={importDialogOpen} onOpenChange={(open) => {
        if (!open) { setImportDialogOpen(false); setImportSource(null); }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Import Categories
            </AlertDialogTitle>
            <AlertDialogDescription>
              Import the category structure from <strong>"{importSource?.name}"</strong> into this level?
              This will copy all categories and subcategories. Existing categories in this level will not be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm} disabled={importing}>
              {importing ? "Importing…" : "Import Categories"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
