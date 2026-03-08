import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveStaffNames } from "@/hooks/useStaffDisplayNames";

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

export type ChatChannel = "production" | "adjudication" | "dm";

export interface EventMessage {
  id: string;
  competition_id: string;
  sender_id: string;
  message_type: "text" | "voice" | "file";
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  reply_to_id: string | null;
  channel: string;
  recipient_id: string | null;
  created_at: string;
  sender?: { full_name: string | null; avatar_url: string | null };
  readBy?: string[];
}

interface ReadCursor {
  user_id: string;
  last_read_at: string;
  full_name?: string | null;
}

export interface ChatStaffMember {
  user_id: string;
  full_name: string;
  role: string;
}

/** Fetch staff members for a competition (for DM picker) */
export function useChatStaff(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["chat-staff", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      // Get all sub-event IDs for this competition
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", competitionId!);
      if (!levels?.length) return [];

      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id")
        .in("level_id", levels.map((l) => l.id));
      if (!subEvents?.length) return [];

      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("user_id, role")
        .in("sub_event_id", subEvents.map((se) => se.id));
      if (!assignments?.length) return [];

      // Deduplicate by user_id, keeping highest-priority role
      const userMap = new Map<string, string>();
      for (const a of assignments) {
        if (!userMap.has(a.user_id)) userMap.set(a.user_id, a.role);
      }

      const userIds = [...userMap.keys()];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Also get organiser/admin via user_roles
      const { data: orgRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["organizer", "admin"]);

      for (const r of orgRoles || []) {
        if (!userMap.has(r.user_id)) userMap.set(r.user_id, r.role);
      }

      // Fetch profiles for org roles too
      const extraIds = (orgRoles || []).map((r) => r.user_id).filter((id) => !userIds.includes(id));
      let allProfiles = profiles || [];
      if (extraIds.length) {
        const { data: extra } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", extraIds);
        allProfiles = [...allProfiles, ...(extra || [])];
      }

      // Resolve names via staff invitation priority
      const allUserIds = [...userMap.keys()];
      const nameMap = await resolveStaffNames(allUserIds);
      const result: ChatStaffMember[] = [];
      for (const [userId, role] of userMap.entries()) {
        result.push({
          user_id: userId,
          full_name: nameMap[userId] || "Unknown",
          role,
        });
      }
      return result.sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });
}

export function useEventChat(
  competitionId: string | undefined,
  channel: ChatChannel = "production",
  dmRecipientId?: string
) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["event-messages", competitionId, channel, dmRecipientId];
  const cursorKey = ["chat-read-cursors", competitionId];

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    enabled: !!competitionId,
    queryFn: async () => {
      let query = supabase
        .from("event_messages" as any)
        .select("*")
        .eq("competition_id", competitionId!)
        .order("created_at", { ascending: true })
        .limit(200);

      if (channel === "dm" && dmRecipientId) {
        // DMs between current user and recipient
        query = query.not("recipient_id", "is", null);
        // We need to get messages where (sender=me AND recipient=them) OR (sender=them AND recipient=me)
        // Supabase doesn't support OR in a single query easily, so we fetch all DMs and filter client-side
      } else {
        query = query.eq("channel", channel).is("recipient_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      let msgs = (data || []) as unknown as EventMessage[];

      // Client-side filter for DMs
      if (channel === "dm" && dmRecipientId && user) {
        msgs = msgs.filter(
          (m) =>
            (m.sender_id === user.id && m.recipient_id === dmRecipientId) ||
            (m.sender_id === dmRecipientId && m.recipient_id === user.id)
        );
      }

      // Fetch sender profiles with staff invitation name resolution
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      if (senderIds.length) {
        const nameMap = await resolveStaffNames(senderIds);
        const { data: avatars } = await supabase
          .from("profiles")
          .select("user_id, avatar_url")
          .in("user_id", senderIds);
        const avatarMap = new Map((avatars || []).map((p) => [p.user_id, p.avatar_url]));
        for (const msg of msgs) {
          msg.sender = {
            full_name: nameMap[msg.sender_id] || "Unknown",
            avatar_url: avatarMap.get(msg.sender_id) || null,
          };
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

  // Compute readBy for each message
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
    const channel_name = `event-messages-${competitionId}-${channel}-${dmRecipientId || "all"}`;
    const sub = supabase
      .channel(channel_name)
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

          const newMsg = payload.new;
          if (newMsg && newMsg.sender_id !== user?.id) {
            playNotificationSound();
            if ("Notification" in window && Notification.permission === "granted") {
              const body = newMsg.message_type === "text" ? newMsg.content : newMsg.message_type === "voice" ? "🎙️ Voice note" : `📎 ${newMsg.file_name || "File"}`;
              new Notification("New message in Event Chat", { body: body || "New message", icon: "/logo.png", tag: `chat-${newMsg.id}` });
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [competitionId, channel, dmRecipientId, qc, user?.id]);

  // Mark as read
  const markAsRead = useCallback(async () => {
    if (!competitionId || !user) return;
    await supabase.from("chat_read_cursors" as any).upsert(
      { competition_id: competitionId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "competition_id,user_id" }
    );
    qc.invalidateQueries({ queryKey: cursorKey });
    qc.invalidateQueries({ queryKey: ["chat-unread", competitionId] });
  }, [competitionId, user, qc]);

  // Send message
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
      const payload: any = {
        competition_id: competitionId,
        sender_id: user.id,
        message_type: messageType,
        content: content || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        reply_to_id: replyToId || null,
        channel: channel === "dm" ? "dm" : channel,
        recipient_id: channel === "dm" && dmRecipientId ? dmRecipientId : null,
      };
      const { error } = await supabase.from("event_messages" as any).insert(payload);
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

/** Lightweight hook just for unread count */
export function useChatUnreadCount(competitionId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["chat-unread", competitionId],
    enabled: !!competitionId && !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data: cursor } = await supabase
        .from("chat_read_cursors" as any)
        .select("last_read_at")
        .eq("competition_id", competitionId!)
        .eq("user_id", user!.id)
        .maybeSingle();

      const lastRead = (cursor as any)?.last_read_at;

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
