import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BannerUploadProps {
  currentUrl?: string | null;
  folder: string;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
  className?: string;
  aspectLabel?: string;
}

export function BannerUpload({ currentUrl, folder, onUploaded, onRemoved, className = "", aspectLabel = "Banner" }: BannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("banners").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
    onUploaded(publicUrl);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground mb-1 block">{aspectLabel}</label>
      {currentUrl ? (
        <div className="relative rounded-md overflow-hidden border border-border/50">
          <img src={currentUrl} alt="Banner" className="w-full h-32 object-cover" />
          {onRemoved && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={onRemoved}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-24 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors text-xs"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          {uploading ? "Uploading…" : `Upload ${aspectLabel}`}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
