import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
}

export function useEventChat(competitionId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["event-messages", competitionId];

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

  // Realtime subscription
  useEffect(() => {
    if (!competitionId) return;
    const channel = supabase
      .channel(`event-messages-${competitionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_messages",
          filter: `competition_id=eq.${competitionId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [competitionId, qc]);

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
    onSuccess: () => qc.invalidateQueries({ queryKey }),
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

  return { messages, isLoading, sendMessage, uploadFile };
}
