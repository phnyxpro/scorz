import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { PageBreadcrumbs } from "@/components/PageBreadcrumbs";
import { ArrowLeft, Plus, Trash2, Edit2, Loader2 } from "lucide-react";

export default function CompetitionFormsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  if (!id) return <div>Competition not found</div>;

  // Fetch competition
  const { data: competition } = useQuery({
    queryKey: ["competitions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, name")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // registration_forms table doesn't exist yet — stub empty
  const forms: { id: string; name: string; description: string | null; created_at: string; updated_at: string }[] = [];
  const isLoading = false;

  // Create form mutation (stub — table doesn't exist yet)
  const createForm = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      toast({ title: "Registration forms feature coming soon", variant: "destructive" });
      throw new Error("registration_forms table not yet created");
    },
    onSuccess: () => {
      setFormName("");
      setFormDescription("");
      setIsCreateOpen(false);
    },
  });

  // Update form mutation
  const updateForm = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (!editingForm) return;
      const { error } = await supabase
        .from("registration_forms")
        .update({ name: data.name, description: data.description })
        .eq("id", editingForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Registration form updated" });
      setEditingForm(null);
      setFormName("");
      setFormDescription("");
      setIsEditOpen(false);
      qc.invalidateQueries({ queryKey: ["registration_forms", id] });
    },
    onError: (error: any) => {
      toast({ title: "Error updating form", description: error.message, variant: "destructive" });
    },
  });

  // Delete form mutation
  const deleteForm = useMutation({
    mutationFn: async () => {
      if (!editingForm) return;
      const { error } = await supabase
        .from("registration_forms")
        .delete()
        .eq("id", editingForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Registration form deleted" });
      setEditingForm(null);
      setIsDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["registration_forms", id] });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting form", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    setEditingForm(null);
    setFormName("");
    setFormDescription("");
    setIsCreateOpen(true);
  };

  const handleEdit = (form: any) => {
    setEditingForm(form);
    setFormName(form.name);
    setFormDescription(form.description || "");
    setIsEditOpen(true);
  };

  const handleDelete = (form: any) => {
    setEditingForm(form);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!formName.trim()) {
      toast({ title: "Form name is required", variant: "destructive" });
      return;
    }
    createForm.mutate({ name: formName, description: formDescription });
  };

  const handleUpdateSubmit = async () => {
    if (!formName.trim()) {
      toast({ title: "Form name is required", variant: "destructive" });
      return;
    }
    updateForm.mutate({ name: formName, description: formDescription });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageBreadcrumbs />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/competitions/${id}`)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Registration Forms</h1>
            <p className="text-sm text-muted-foreground">
              {competition?.name}
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Create and manage custom registration forms for this competition. Contestants will fill out these forms during registration.
            </p>
          </CardContent>
        </Card>

        {/* Create Button */}
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Form
        </Button>

        {/* Forms List */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading forms…
          </div>
        ) : forms && forms.length > 0 ? (
          <div className="grid gap-4">
            {forms.map((form) => (
              <Card key={form.id} className="hover:border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{form.name}</CardTitle>
                      {form.description && (
                        <CardDescription className="mt-1">{form.description}</CardDescription>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Updated {new Date(form.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(form)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline ml-1">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(form)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline ml-1">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">No registration forms yet</p>
              <Button onClick={handleCreate}>Create Your First Form</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Form Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Registration Form</DialogTitle>
            <DialogDescription>
              Add a new registration form for this competition
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-name">Form Name</Label>
              <Input
                id="form-name"
                placeholder="e.g., Initial Registration"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="form-description">Description (Optional)</Label>
              <Textarea
                id="form-description"
                placeholder="Describe what this form is for…"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createForm.isPending}>
              {createForm.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Registration Form</DialogTitle>
            <DialogDescription>
              Update form details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-form-name">Form Name</Label>
              <Input
                id="edit-form-name"
                placeholder="Form name"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-form-description">Description (Optional)</Label>
              <Textarea
                id="edit-form-description"
                placeholder="Describe what this form is for…"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubmit} disabled={updateForm.isPending}>
              {updateForm.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The form "{editingForm?.name}" will be permanently deleted.
            </AlertDialogDescription>
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
