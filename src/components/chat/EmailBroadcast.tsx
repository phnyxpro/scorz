import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecipientGroup {
  key: string;
  label: string;
  count: number;
}

function useRecipientCounts(competitionId: string) {
  return useQuery({
    queryKey: ["broadcast-recipient-counts", competitionId],
    queryFn: async () => {
      const counts: Record<string, number> = {};

      // Organisers
      const { count: orgCount } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .in("role", ["admin", "organizer"] as any);
      counts.organisers = orgCount || 0;

      // Get sub-event IDs for this competition
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", competitionId);
      const levelIds = (levels || []).map((l) => l.id);

      let subEventIds: string[] = [];
      if (levelIds.length) {
        const { data: subEvents } = await supabase
          .from("sub_events")
          .select("id")
          .in("level_id", levelIds);
        subEventIds = (subEvents || []).map((se) => se.id);
      }

      // Judges
      if (subEventIds.length) {
        const { data: judgeAssignments } = await supabase
          .from("sub_event_assignments")
          .select("user_id")
          .in("sub_event_id", subEventIds)
          .eq("role", "judge" as any);
        counts.judges = new Set((judgeAssignments || []).map((a) => a.user_id)).size;

        const { data: tabAssignments } = await supabase
          .from("sub_event_assignments")
          .select("user_id")
          .in("sub_event_id", subEventIds)
          .eq("role", "tabulator" as any);
        counts.tabulators = new Set((tabAssignments || []).map((a) => a.user_id)).size;
      } else {
        counts.judges = 0;
        counts.tabulators = 0;
      }

      // Contestants
      const { count: contestantCount } = await supabase
        .from("contestant_registrations")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId)
        .eq("status", "approved");
      counts.contestants = contestantCount || 0;

      // Audience
      if (subEventIds.length) {
        const { count: ticketCount } = await supabase
          .from("event_tickets")
          .select("id", { count: "exact", head: true })
          .in("sub_event_id", subEventIds);
        counts.audience = ticketCount || 0;
      } else {
        counts.audience = 0;
      }

      return counts;
    },
  });
}

export function EmailBroadcast({ competitionId }: { competitionId: string }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [extraEmails, setExtraEmails] = useState("");
  const [sending, setSending] = useState(false);

  const { data: counts = {} } = useRecipientCounts(competitionId);
  const { data: competition } = useQuery({
    queryKey: ["competition-name", competitionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("competitions")
        .select("name")
        .eq("id", competitionId)
        .single();
      return data;
    },
  });

  const groups: RecipientGroup[] = [
    { key: "organisers", label: "Organisers", count: counts.organisers || 0 },
    { key: "judges", label: "Judges", count: counts.judges || 0 },
    { key: "tabulators", label: "Tabulators", count: counts.tabulators || 0 },
    { key: "contestants", label: "Contestants", count: counts.contestants || 0 },
    { key: "audience", label: "Audience", count: counts.audience || 0 },
  ];

  const toggleGroup = (key: string) => {
    setSelectedGroups((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]
    );
  };

  const customEmailList = extraEmails
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  const totalRecipients =
    selectedGroups.reduce((sum, key) => sum + (counts[key] || 0), 0) +
    customEmailList.length;

  const canSend =
    subject.trim().length > 0 &&
    content.trim().length > 0 &&
    (selectedGroups.length > 0 || customEmailList.length > 0);

  const handleSend = async () => {
    if (!canSend || !user) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: {
          competition_id: competitionId,
          subject: subject.trim(),
          content: content.trim(),
          recipient_groups: selectedGroups,
          extra_emails: customEmailList,
        },
      });
      if (error) throw error;
      const sent = data?.sent ?? 0;
      toast({ title: "Broadcast sent", description: `Email delivered to ${sent} recipient(s)` });
      setSubject("");
      setContent("");
      setExtraEmails("");
      setSelectedGroups([]);
      setIsOpen(false);
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mt-4 border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Broadcast
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Recipient Groups */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                Recipients
              </Label>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <label
                    key={g.key}
                    className="flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={selectedGroups.includes(g.key)}
                      onCheckedChange={() => toggleGroup(g.key)}
                    />
                    <span className="text-sm">{g.label}</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {g.count}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>

            {/* Extra Emails */}
            <div>
              <Label htmlFor="extra-emails" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Additional Emails (comma-separated)
              </Label>
              <Input
                id="extra-emails"
                placeholder="name@example.com, other@example.com"
                value={extraEmails}
                onChange={(e) => setExtraEmails(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Subject */}
            <div>
              <Label htmlFor="broadcast-subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Subject
              </Label>
              <Input
                id="broadcast-subject"
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Message Editor & Preview - 2 Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Editor Column */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Message
                </Label>
                <div className="min-h-[300px]">
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Write your message here..."
                  />
                </div>
              </div>

              {/* Preview Column */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email Preview
                </Label>
                <ScrollArea className="h-[300px] border rounded-md bg-[hsl(var(--muted)/0.3)]">
                  <div className="p-4">
                    <div className="max-w-[560px] mx-auto bg-background rounded-lg overflow-hidden shadow-sm border">
                      {/* Header */}
                      <div className="bg-[#1a1b25] p-6 text-center">
                        <span className="text-2xl font-extrabold tracking-[2px] text-white">SCOR</span>
                        <span className="text-2xl font-extrabold tracking-[2px] text-[#f59e0b]">Z</span>
                      </div>

                      {/* Body */}
                      <div className="p-6 space-y-4">
                        {subject && (
                          <h2 className="text-lg font-bold text-foreground">{subject}</h2>
                        )}
                        {competition?.name && (
                          <p className="text-xs text-muted-foreground">From: {competition.name}</p>
                        )}
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ 
                              __html: content || '<p class="text-muted-foreground italic">Your message will appear here...</p>' 
                            }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t px-6 py-4 text-center space-y-2">
                        <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
                          © 2026 SCORZ | Powered by phnyx.dev
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          <span className="underline">Manage Preferences</span>
                          {" · "}
                          <span className="underline">Unsubscribe</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {totalRecipients > 0
                  ? `This will send to ~${totalRecipients} recipient(s)`
                  : "Select at least one recipient group or add emails"}
              </p>
              <Button
                size="sm"
                disabled={!canSend || sending}
                onClick={handleSend}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send Broadcast
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
