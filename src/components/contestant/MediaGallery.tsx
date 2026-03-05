import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ImagePlus, Trash2, Play, Image as ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ContestantMediaGalleryProps {
  userId: string;
  isOwnProfile: boolean;
}

interface MediaFile {
  name: string;
  id: string;
  url: string;
  type: "image" | "video";
  created_at: string;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi"];
const ACCEPTED = [...IMAGE_EXTENSIONS.map(e => `.${e}`), ...VIDEO_EXTENSIONS.map(e => `.${e}`)].join(",");

function getFileType(name: string): "image" | "video" {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return VIDEO_EXTENSIONS.includes(ext) ? "video" : "image";
}

export function ContestantMediaGallery({ userId, isOwnProfile }: ContestantMediaGalleryProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<MediaFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const { data: files, isLoading } = useQuery({
    queryKey: ["contestant-media", userId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("contestant-media")
        .list(userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;

      const { data: { publicUrl: baseUrl } } = supabase.storage
        .from("contestant-media")
        .getPublicUrl(`${userId}/placeholder`);
      const prefix = baseUrl.replace("/placeholder", "");

      return (data || [])
        .filter(f => f.name !== ".emptyFolderPlaceholder")
        .map<MediaFile>(f => ({
          name: f.name,
          id: f.id!,
          url: `${prefix}/${f.name}`,
          type: getFileType(f.name),
          created_at: f.created_at!,
        }));
    },
  });

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `${userId}/${safeName}`;

        const { error } = await supabase.storage
          .from("contestant-media")
          .upload(path, file, { upsert: false });

        if (error) throw error;
      }
      toast({ title: "Upload complete", description: `${files.length} file(s) uploaded.` });
      queryClient.invalidateQueries({ queryKey: ["contestant-media", userId] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [userId, queryClient]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = "";
  }, [uploadFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const { error } = await supabase.storage
        .from("contestant-media")
        .remove([`${userId}/${fileName}`]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      queryClient.invalidateQueries({ queryKey: ["contestant-media", userId] });
      setLightbox(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const images = (files || []).filter(f => f.type === "image");
  const videos = (files || []).filter(f => f.type === "video");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Media Gallery
              </CardTitle>
              <CardDescription>Performance photos and videos</CardDescription>
            </div>
            {isOwnProfile && (
              <div className="relative">
                <Button size="sm" variant="outline" disabled={uploading} className="relative">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImagePlus className="h-4 w-4 mr-1" />}
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
                <Input
                  type="file"
                  accept={ACCEPTED}
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (files || []).length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No media uploaded yet.</p>
              {isOwnProfile && (
                <p className="text-muted-foreground text-xs mt-1">Upload photos and videos of your performances!</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Photos */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Photos <Badge variant="outline" className="ml-1 text-[10px]">{images.length}</Badge>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((file) => (
                      <motion.div
                        key={file.id}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-border/30 cursor-pointer bg-muted"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setLightbox(file)}
                      >
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {isOwnProfile && (
                          <button
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(file.name); }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {videos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Videos <Badge variant="outline" className="ml-1 text-[10px]">{videos.length}</Badge>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {videos.map((file) => (
                      <div key={file.id} className="group relative rounded-lg overflow-hidden border border-border/30 bg-muted">
                        <video
                          src={file.url}
                          controls
                          preload="metadata"
                          className="w-full aspect-video object-cover"
                        />
                        {isOwnProfile && (
                          <button
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteMutation.mutate(file.name)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              className="relative max-w-4xl max-h-[90vh] w-full mx-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={lightbox.url} alt={lightbox.name} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
              <div className="absolute top-2 right-2 flex gap-2">
                {isOwnProfile && (
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteMutation.mutate(lightbox.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setLightbox(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
