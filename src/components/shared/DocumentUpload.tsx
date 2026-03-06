import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, X, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  currentUrl?: string | null;
  folder: string;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
  className?: string;
  label?: string;
  accept?: string;
}

export function DocumentUpload({
  currentUrl,
  folder,
  onUploaded,
  onRemoved,
  className = "",
  label = "Document",
  accept = ".pdf,.doc,.docx,.txt",
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getFileName = (url: string) => {
    try {
      const parts = url.split("/");
      const raw = parts[parts.length - 1];
      // Remove timestamp prefix if present (e.g. "1234567890.pdf" → "document.pdf")
      return decodeURIComponent(raw);
    } catch {
      return "document";
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      toast({ title: "Invalid file", description: "Please upload a PDF or Word document", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
    onUploaded(publicUrl);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {currentUrl ? (
        <div className="flex items-center gap-3 border border-border/50 rounded-md p-3">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getFileName(currentUrl)}</p>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              <Download className="h-3 w-3" /> Download
            </a>
          </div>
          {onRemoved && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemoved}>
              <X className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-20 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-xs"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          {uploading ? "Uploading…" : `Upload ${label}`}
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleUpload} />
    </div>
  );
}
