import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Play a short notification chime using Web Audio API */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Audio not available
  }
}

export interface EventMessage {
  id: string;
  competition_id: string;
  sender_id: string;
  message_type: "text" | "voice" | "file";
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  reply_to_id: string | null;
  created_at: string;
  sender?: { full_name: string | null; avatar_url: string | null };
  readBy?: string[]; // full_names of users who have read past this message
}

interface ReadCursor {
  user_id: string;
  last_read_at: string;
  full_name?: string | null;
}

export function useEventChat(competitionId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["event-messages", competitionId];
  const cursorKey = ["chat-read-cursors", competitionId];

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_messages" as any)
        .select("*")
        .eq("competition_id", competitionId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      const msgs = (data || []) as unknown as EventMessage[];

      // Fetch sender profiles
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      if (senderIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", senderIds);
        const profileMap = new Map(
          (profiles || []).map((p) => [p.user_id, p])
        );
        for (const msg of msgs) {
          const p = profileMap.get(msg.sender_id);
          msg.sender = p
            ? { full_name: p.full_name, avatar_url: p.avatar_url }
            : { full_name: "Unknown", avatar_url: null };
        }
      }
      return msgs;
    },
  });

  // Fetch read cursors for this competition
  const { data: readCursors = [] } = useQuery({
    queryKey: cursorKey,
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_read_cursors" as any)
        .select("*")
        .eq("competition_id", competitionId!);
      if (error) throw error;
      const cursors = (data || []) as unknown as ReadCursor[];

      // Attach profile names
      const userIds = cursors.map((c) => c.user_id);
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
        for (const c of cursors) {
          c.full_name = profileMap.get(c.user_id) || null;
        }
      }
      return cursors;
    },
  });

  // Compute readBy for each message (other users who read at or after message time)
  const messagesWithReads = messages.map((msg) => {
    const readBy = readCursors
      .filter(
        (c) =>
          c.user_id !== msg.sender_id &&
          new Date(c.last_read_at) >= new Date(msg.created_at)
      )
      .map((c) => c.full_name || "Unknown");
    return { ...msg, readBy };
  });

  // Realtime subscription with browser notification
  useEffect(() => {
    if (!competitionId) return;
    const channel = supabase
      .channel(`event-messages-${competitionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_messages",
          filter: `competition_id=eq.${competitionId}`,
        },
        (payload: any) => {
          qc.invalidateQueries({ queryKey });
          qc.invalidateQueries({ queryKey: ["chat-unread", competitionId] });

          // Browser notification for messages from others
          const newMsg = payload.new;
          if (newMsg && newMsg.sender_id !== user?.id && "Notification" in window && Notification.permission === "granted") {
            const body = newMsg.message_type === "text" ? newMsg.content : newMsg.message_type === "voice" ? "🎙️ Voice note" : `📎 ${newMsg.file_name || "File"}`;
            new Notification("New message in Event Chat", { body: body || "New message", icon: "/logo.png", tag: `chat-${newMsg.id}` });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [competitionId, qc, user?.id]);

  // Mark as read (upsert cursor)
  const markAsRead = useCallback(async () => {
    if (!competitionId || !user) return;
    await supabase.from("chat_read_cursors" as any).upsert(
      { competition_id: competitionId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "competition_id,user_id" }
    );
    qc.invalidateQueries({ queryKey: cursorKey });
    qc.invalidateQueries({ queryKey: ["chat-unread", competitionId] });
  }, [competitionId, user, qc]);

  // Send text message
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      messageType = "text",
      fileUrl,
      fileName,
      replyToId,
    }: {
      content?: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      replyToId?: string;
    }) => {
      if (!competitionId || !user) throw new Error("Not ready");
      const { error } = await supabase.from("event_messages" as any).insert({
        competition_id: competitionId,
        sender_id: user.id,
        message_type: messageType,
        content: content || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        reply_to_id: replyToId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      markAsRead();
    },
  });

  // Upload file to storage
  const uploadFile = useCallback(
    async (file: File, folder: string = "files") => {
      const path = `${competitionId}/${folder}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(path);
      return data.publicUrl;
    },
    [competitionId]
  );

  return { messages: messagesWithReads, isLoading, sendMessage, uploadFile, markAsRead, readCursors };
}

/** Lightweight hook just for unread count — use on buttons/badges without loading full chat */
export function useChatUnreadCount(competitionId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["chat-unread", competitionId],
    enabled: !!competitionId && !!user,
    refetchInterval: 30000, // poll every 30s as fallback
    queryFn: async () => {
      // Get user's last read cursor
      const { data: cursor } = await supabase
        .from("chat_read_cursors" as any)
        .select("last_read_at")
        .eq("competition_id", competitionId!)
        .eq("user_id", user!.id)
        .maybeSingle();

      const lastRead = (cursor as any)?.last_read_at;

      // Count messages after last read
      let query = supabase
        .from("event_messages" as any)
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId!)
        .neq("sender_id", user!.id);

      if (lastRead) {
        query = query.gt("created_at", lastRead);
      }

      const { count, error } = await query;
      if (error) return 0;
      return count || 0;
    },
  });

  // Also listen to realtime for instant updates
  useEffect(() => {
    if (!competitionId) return;
    const channel = supabase
      .channel(`chat-unread-${competitionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "event_messages",
        filter: `competition_id=eq.${competitionId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["chat-unread", competitionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [competitionId, qc]);

  return unreadCount;
}
