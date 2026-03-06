import { useState, useRef, useEffect } from "react";
import { useEventChat } from "@/hooks/useEventChat";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage } from "./ChatMessage";
import { VoiceRecorder } from "./VoiceRecorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Loader2, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";

interface EventChatProps {
  competitionId: string;
}

export function EventChat({ competitionId }: EventChatProps) {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, uploadFile } = useEventChat(competitionId);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate({ content: text.trim() });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file, "files");
      sendMessage.mutate({ messageType: "file", fileUrl: url, fileName: file.name });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleVoiceRecorded = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      const url = await uploadFile(file, "voice");
      sendMessage.mutate({ messageType: "voice", fileUrl: url, fileName: file.name });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Group messages by date
  const dateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d, yyyy");
  };

  let lastDate = "";

  return (
    <div className="flex flex-col h-[500px] border border-border/50 rounded-xl bg-card/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Event Chat</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No messages yet. Start the conversation!</p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => {
            const msgDate = dateLabel(msg.created_at);
            const showDate = msgDate !== lastDate;
            lastDate = msgDate;
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] bg-muted rounded-full px-3 py-0.5 text-muted-foreground font-medium">
                      {msgDate}
                    </span>
                  </div>
                )}
                <ChatMessage message={msg} isOwn={msg.sender_id === user?.id} />
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border/50 bg-muted/20">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="*/*"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>
        <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={uploading} />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="flex-1 h-8 text-sm bg-background"
          disabled={uploading}
        />
        <Button
          type="button"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
