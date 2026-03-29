import { EventMessage } from "@/hooks/useEventChat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Download, CheckCheck, Reply } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: EventMessage;
  isOwn: boolean;
  replyTo?: EventMessage | null;
  onReply?: (message: EventMessage) => void;
}

export function ChatMessage({ message, isOwn, replyTo, onReply }: ChatMessageProps) {
  const initials = (message.sender?.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const readByNames = message.readBy || [];
  const hasBeenRead = readByNames.length > 0;

  const replyPreview = (msg: EventMessage) => {
    if (msg.message_type === "voice") return "🎙️ Voice note";
    if (msg.message_type === "file") return `📎 ${msg.file_name || "File"}`;
    return msg.content?.slice(0, 80) || "";
  };

  return (
    <div className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
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

        {/* Quoted reply */}
        {replyTo && (
          <div
            className={`rounded-lg px-2.5 py-1.5 text-[11px] border-l-2 border-primary/50 mb-0.5 ${
              isOwn ? "bg-primary/10 text-primary-foreground/70" : "bg-muted/60 text-muted-foreground"
            }`}
          >
            <p className="font-semibold text-[10px] text-primary">
              {replyTo.sender?.full_name || "Unknown"}
            </p>
            <p className="truncate">{replyPreview(replyTo)}</p>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          {isOwn && onReply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => onReply(message)}
            >
              <Reply className="h-3 w-3" />
            </Button>
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
          {!isOwn && onReply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => onReply(message)}
            >
              <Reply className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className={`flex items-center gap-1 px-1 ${isOwn ? "justify-end" : ""}`}>
          <p className="text-[9px] text-muted-foreground">
            {format(new Date(message.created_at), "h:mm a")}
          </p>
          {isOwn && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCheck
                  className={`h-3 w-3 ${
                    hasBeenRead ? "text-primary" : "text-muted-foreground/40"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {hasBeenRead
                  ? `Seen by ${readByNames.join(", ")}`
                  : "Not seen yet"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
