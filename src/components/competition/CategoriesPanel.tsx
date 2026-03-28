import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronRight, ChevronDown, FolderTree, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, level_id, sub_event_id }: { id: string; level_id: string; sub_event_id: string | null }) => {
      // Delete the category (cascade will handle children)
      const { error } = await supabase.from("competition_categories").delete().eq("id", id);
      if (error) throw error;
      // If it had a linked sub_event, delete that too
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
      // Create a sub_event for this leaf category
      const { data: se, error: seErr } = await supabase
        .from("sub_events")
        .insert({ level_id: levelId, name: fullPath })
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
}: {
  cat: Category;
  allCategories: Category[];
  tree: Map<string | null, Category[]>;
  levelId: string;
  depth: number;
  onCreate: (parentId: string, name: string) => void;
  onDelete: (cat: Category) => void;
  onLink: (cat: Category) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const children = tree.get(cat.id) || [];
  const isLeaf = children.length === 0;

  const handleAdd = () => {
    if (!newName.trim()) return;
    onCreate(cat.id, newName.trim());
    setNewName("");
    setAdding(false);
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
        <span className="text-sm font-medium text-foreground flex-1">{cat.name}</span>
        {isLeaf && cat.sub_event_id && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <Link2 className="h-2.5 w-2.5" /> Linked
          </Badge>
        )}
        {isLeaf && !cat.sub_event_id && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => onLink(cat)}>
            <Link2 className="h-3 w-3 mr-1" /> Link Sub-Event
          </Button>
        )}
        {children.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{children.length}</Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-primary"
          onClick={() => setAdding(!adding)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
          onClick={() => onDelete(cat)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
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

      {expanded && children.map((child) => (
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
        />
      ))}
    </div>
  );
}

export function CategoriesPanel({ levelId }: { levelId: string }) {
  const { data: categories } = useCategories(levelId);
  const createCat = useCreateCategory();
  const deleteCat = useDeleteCategory();
  const linkSE = useLinkSubEvent();
  const [newRootName, setNewRootName] = useState("");

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

  return (
    <div className="pl-4 border-l border-border/50 space-y-3 mt-3">
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
    </div>
  );
}
