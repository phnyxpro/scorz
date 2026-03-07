import { useState, useRef, useEffect, useMemo } from "react";
import { useEventChat, useChatStaff, EventMessage, ChatChannel } from "@/hooks/useEventChat";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage } from "./ChatMessage";
import { VoiceRecorder } from "./VoiceRecorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Loader2, MessageSquare, Bell, BellOff, X, Users, Gavel, User, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";

interface EventChatProps {
  competitionId: string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  production: {
    label: "Production",
    icon: <Users className="h-3.5 w-3.5" />,
    description: "Admins, Organisers, Judges & Tabulators",
  },
  adjudication: {
    label: "Adjudication",
    icon: <Gavel className="h-3.5 w-3.5" />,
    description: "Judges & Tabulators only",
  },
};

export function EventChat({ competitionId }: EventChatProps) {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState<ChatChannel>("production");
  const [dmRecipientId, setDmRecipientId] = useState<string | undefined>();
  const [showDmPicker, setShowDmPicker] = useState(false);
  const [dmSearch, setDmSearch] = useState("");

  const { messages, isLoading, sendMessage, uploadFile, markAsRead } = useEventChat(
    competitionId,
    activeChannel,
    dmRecipientId
  );
  const { data: staffMembers = [] } = useChatStaff(competitionId);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<EventMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );

  const messageMap = useMemo(() => {
    const map = new Map<string, EventMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const dmRecipientName = useMemo(() => {
    if (!dmRecipientId) return "";
    return staffMembers.find((s) => s.user_id === dmRecipientId)?.full_name || "Unknown";
  }, [dmRecipientId, staffMembers]);

  const filteredStaff = useMemo(() => {
    const term = dmSearch.toLowerCase();
    return staffMembers
      .filter((s) => s.user_id !== user?.id)
      .filter((s) => !term || s.full_name.toLowerCase().includes(term) || s.role.toLowerCase().includes(term));
  }, [staffMembers, dmSearch, user?.id]);

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

  const handleSelectDm = (userId: string) => {
    setDmRecipientId(userId);
    setActiveChannel("dm");
    setShowDmPicker(false);
    setDmSearch("");
    setReplyTo(null);
  };

  const handleBackToChannels = () => {
    setActiveChannel("production");
    setDmRecipientId(undefined);
    setShowDmPicker(false);
    setReplyTo(null);
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

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: "Admin",
      organizer: "Organiser",
      judge: "Judge",
      tabulator: "Tabulator",
      witness: "Witness",
      chief_judge: "Chief Judge",
    };
    return map[role] || role;
  };

  const roleColor = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-destructive/15 text-destructive",
      organizer: "bg-primary/15 text-primary",
      judge: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      chief_judge: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
      tabulator: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      witness: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    };
    return map[role] || "bg-muted text-muted-foreground";
  };

  let lastDate = "";

  // DM Picker View
  if (showDmPicker) {
    return (
      <div className="flex flex-col h-[500px] border border-border/50 rounded-xl bg-card/80 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowDmPicker(false)}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-semibold text-foreground">Direct Message</span>
        </div>
        <div className="px-3 py-2 border-b border-border/30">
          <Input
            value={dmSearch}
            onChange={(e) => setDmSearch(e.target.value)}
            placeholder="Search staff…"
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {filteredStaff.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No staff found</p>
            )}
            {filteredStaff.map((staff) => (
              <button
                key={staff.user_id}
                onClick={() => handleSelectDm(staff.user_id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {staff.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{staff.full_name}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] ${roleColor(staff.role)}`}>
                  {roleLabel(staff.role)}
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border border-border/50 rounded-xl bg-card/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/30">
        {activeChannel === "dm" && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleBackToChannels}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          {activeChannel === "dm" ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">{dmRecipientName}</span>
              <span className="text-[10px] text-muted-foreground">Direct Message</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground">
                {CHANNEL_CONFIG[activeChannel]?.label}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {CHANNEL_CONFIG[activeChannel]?.description}
              </span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mr-1">{messages.length}</span>
        {notifPermission !== "granted" ? (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={requestNotifications} title="Enable notifications">
            <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        ) : (
          <Bell className="h-3.5 w-3.5 text-primary" />
        )}
      </div>

      {/* Channel Tabs */}
      {activeChannel !== "dm" && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 bg-muted/10">
          {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => { setActiveChannel(key as ChatChannel); setReplyTo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                activeChannel === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {config.icon}
              {config.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setShowDmPicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
          >
            <User className="h-3.5 w-3.5" />
            DM
          </button>
        </div>
      )}

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
            <p className="text-xs">
              {activeChannel === "dm"
                ? `Start a conversation with ${dmRecipientName}`
                : `No messages in ${CHANNEL_CONFIG[activeChannel]?.label} yet`}
            </p>
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
          placeholder={replyTo ? "Reply…" : activeChannel === "dm" ? `Message ${dmRecipientName}…` : `Message ${CHANNEL_CONFIG[activeChannel]?.label}…`}
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
