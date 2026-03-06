import { EventMessage } from "@/hooks/useEventChat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";

interface ChatMessageProps {
  message: EventMessage;
  isOwn: boolean;
}

export function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const initials = (message.sender?.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn && (
        <Avatar className="h-7 w-7 shrink-0 mt-1">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[75%] space-y-0.5 ${isOwn ? "items-end" : ""}`}>
        {!isOwn && (
          <p className="text-[10px] font-medium text-muted-foreground px-1">
            {message.sender?.full_name || "Unknown"}
          </p>
        )}
        <div
          className={`rounded-xl px-3 py-2 text-sm break-words ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          }`}
        >
          {message.message_type === "text" && <p>{message.content}</p>}

          {message.message_type === "voice" && message.file_url && (
            <audio controls src={message.file_url} className="max-w-full h-8" preload="metadata" />
          )}

          {message.message_type === "file" && message.file_url && (
            <a
              href={message.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 underline"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{message.file_name || "File"}</span>
              <Download className="h-3 w-3 shrink-0" />
            </a>
          )}
        </div>
        <p className={`text-[9px] text-muted-foreground px-1 ${isOwn ? "text-right" : ""}`}>
          {format(new Date(message.created_at), "h:mm a")}
        </p>
      </div>
    </div>
  );
}
