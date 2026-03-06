import { useState, useRef, useEffect, useMemo } from "react";
import { useEventChat, EventMessage } from "@/hooks/useEventChat";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage } from "./ChatMessage";
import { VoiceRecorder } from "./VoiceRecorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Loader2, MessageSquare, Bell, BellOff, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";

interface EventChatProps {
  competitionId: string;
}

export function EventChat({ competitionId }: EventChatProps) {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, uploadFile, markAsRead } = useEventChat(competitionId);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<EventMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );

  // Build a map for quick reply-to lookups
  const messageMap = useMemo(() => {
    const map = new Map<string, EventMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) markAsRead();
  }, [messages.length, markAsRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      toast({ title: "Notifications enabled", description: "You'll be alerted when new messages arrive." });
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate({ content: text.trim(), replyToId: replyTo?.id });
    setText("");
    setReplyTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && replyTo) {
      setReplyTo(null);
    }
  };

  const handleReply = (msg: EventMessage) => {
    setReplyTo(msg);
    inputRef.current?.focus();
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
      sendMessage.mutate({ messageType: "file", fileUrl: url, fileName: file.name, replyToId: replyTo?.id });
      setReplyTo(null);
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
      sendMessage.mutate({ messageType: "voice", fileUrl: url, fileName: file.name, replyToId: replyTo?.id });
      setReplyTo(null);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const dateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d, yyyy");
  };

  const replyPreview = (msg: EventMessage) => {
    if (msg.message_type === "voice") return "🎙️ Voice note";
    if (msg.message_type === "file") return `📎 ${msg.file_name || "File"}`;
    return msg.content?.slice(0, 60) || "";
  };

  let lastDate = "";

  return (
    <div className="flex flex-col h-[500px] border border-border/50 rounded-xl bg-card/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Event Chat</span>
        <span className="text-[10px] text-muted-foreground ml-auto mr-1">{messages.length} messages</span>
        {notifPermission !== "granted" ? (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={requestNotifications} title="Enable notifications">
            <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        ) : (
          <Bell className="h-3.5 w-3.5 text-primary" />
        )}
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
            const parentMsg = msg.reply_to_id ? messageMap.get(msg.reply_to_id) || null : null;
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] bg-muted rounded-full px-3 py-0.5 text-muted-foreground font-medium">
                      {msgDate}
                    </span>
                  </div>
                )}
                <ChatMessage
                  message={msg}
                  isOwn={msg.sender_id === user?.id}
                  replyTo={parentMsg}
                  onReply={handleReply}
                />
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/50 bg-primary/5">
          <div className="w-0.5 h-8 bg-primary rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-primary truncate">
              {replyTo.sender?.full_name || "Unknown"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {replyPreview(replyTo)}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyTo(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

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
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? "Reply…" : "Type a message…"}
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
