import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket, CheckCircle, ExternalLink, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AudienceTicketFormProps {
  subEventId: string;
  subEventName: string;
  ticketingType?: string;
  ticketPrice?: number | null;
  maxTickets?: number | null;
  externalTicketUrl?: string | null;
}

export function AudienceTicketForm({
  subEventId,
  subEventName,
  ticketingType = "free",
  ticketPrice,
  maxTickets,
  externalTicketUrl,
}: AudienceTicketFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  // External mode
  if (ticketingType === "external" && externalTicketUrl) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tickets for <span className="font-medium text-foreground">{subEventName}</span> are available on an external platform.
        </p>
        <Button className="w-full" asChild>
          <a href={externalTicketUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Buy Ticket
          </a>
        </Button>
      </div>
    );
  }

  const handleFreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    const ticket = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("event_tickets").insert({
      sub_event_id: subEventId,
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      ticket_number: ticket,
      ticket_type: "free",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setTicketNumber(ticket);
    toast({ title: "Ticket registered!", description: `Your ticket: ${ticket}` });
  };

  const handlePaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-ticket-checkout", {
      body: { sub_event_id: subEventId, full_name: name.trim(), email: email.trim(), phone: phone.trim() || null },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message || "Checkout failed", variant: "destructive" });
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  if (ticketNumber) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle className="h-10 w-10 text-secondary mb-3" />
        <p className="text-sm font-medium text-foreground">You're registered!</p>
        <p className="text-xs text-muted-foreground mt-1">Your ticket number:</p>
        <p className="font-mono text-lg text-primary font-bold mt-1">{ticketNumber}</p>
        <p className="text-xs text-muted-foreground mt-2">Save this number — you'll need it for voting and entry.</p>
      </div>
    );
  }

  const isPaid = ticketingType === "paid";

  return (
    <form onSubmit={isPaid ? handlePaidSubmit : handleFreeSubmit} className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Register as audience for <span className="font-medium text-foreground">{subEventName}</span>
        {isPaid && ticketPrice ? <span className="ml-1 font-semibold text-primary">(${ticketPrice.toFixed(2)})</span> : null}
      </p>
      <Input placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} required />
      <Input type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} required />
      <Input placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
      <Button type="submit" className="w-full" disabled={submitting || !name.trim() || !email.trim()}>
        {isPaid ? <CreditCard className="h-4 w-4 mr-2" /> : <Ticket className="h-4 w-4 mr-2" />}
        {submitting ? "Processing…" : isPaid ? `Pay $${(ticketPrice ?? 0).toFixed(2)}` : "Get Free Ticket"}
      </Button>
    </form>
  );
}
