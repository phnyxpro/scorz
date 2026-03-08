import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface Props {
  competitionId: string;
}

export function RegistrationFormsInline({ competitionId }: Props) {
  const qc = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Stub – registration_forms table not yet created
  const forms: { id: string; name: string; description: string | null; updated_at: string }[] = [];

  const createForm = useMutation({
    mutationFn: async () => {
      toast({ title: "Registration forms feature coming soon", variant: "destructive" });
      throw new Error("registration_forms table not yet created");
    },
    onSuccess: () => {
      setFormName("");
      setFormDescription("");
      setIsCreateOpen(false);
    },
  });

  const updateForm = useMutation({
    mutationFn: async () => {
      throw new Error("registration_forms table not yet created");
    },
  });

  const deleteForm = useMutation({
    mutationFn: async () => {
      throw new Error("registration_forms table not yet created");
    },
    onSuccess: () => {
      toast({ title: "Registration form deleted" });
      setEditingForm(null);
      setIsDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["registration_forms", competitionId] });
    },
  });

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registration Forms</CardTitle>
          <CardDescription className="text-xs">
            Create and manage custom registration forms for this competition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            size="sm"
            onClick={() => { setEditingForm(null); setFormName(""); setFormDescription(""); setIsCreateOpen(true); }}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> New Form
          </Button>

          {forms.length > 0 ? (
            <div className="grid gap-3">
              {forms.map((form) => (
                <Card key={form.id} className="border-border/40">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm">{form.name}</CardTitle>
                        {form.description && <CardDescription className="text-xs mt-0.5">{form.description}</CardDescription>}
                        <p className="text-[10px] text-muted-foreground mt-1">Updated {new Date(form.updated_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingForm(form); setFormName(form.name); setFormDescription(form.description || ""); setIsEditOpen(true); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setEditingForm(form); setIsDeleteOpen(true); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No registration forms yet. Create one to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Registration Form</DialogTitle>
            <DialogDescription>Add a new registration form for this competition</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Form Name</Label><Input placeholder="e.g., Initial Registration" value={formName} onChange={e => setFormName(e.target.value)} className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Description (Optional)</Label><Textarea placeholder="Describe what this form is for…" value={formDescription} onChange={e => setFormDescription(e.target.value)} className="mt-1 resize-none text-sm" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createForm.mutate()} disabled={createForm.isPending}>{createForm.isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Registration Form</DialogTitle>
            <DialogDescription>Update form details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Form Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className="mt-1 resize-none text-sm" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => updateForm.mutate()} disabled={updateForm.isPending}>{updateForm.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration Form?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. "{editingForm?.name}" will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteForm.mutate()} disabled={deleteForm.isPending} className="bg-destructive hover:bg-destructive/90">
              {deleteForm.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
