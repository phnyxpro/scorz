import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TicketSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setError("No session found");
      setLoading(false);
      return;
    }

    supabase.functions
      .invoke("verify-ticket-payment", { body: { session_id: sessionId } })
      .then(({ data, error: fnErr }) => {
        if (fnErr || data?.error) {
          setError(data?.error || fnErr?.message || "Verification failed");
        } else {
          setTicketNumber(data.ticket_number);
        }
        setLoading(false);
      });
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          {loading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verifying your payment…</p>
            </>
          ) : error ? (
            <>
              <p className="text-destructive font-medium">{error}</p>
              <Button asChild variant="outline">
                <Link to="/public-events">Back to Events</Link>
              </Button>
            </>
          ) : (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold">Payment Successful!</h1>
              <p className="text-muted-foreground">Your ticket number:</p>
              <p className="font-mono text-2xl font-bold text-primary">{ticketNumber}</p>
              <p className="text-xs text-muted-foreground">
                A confirmation email with your QR code has been sent. Save your ticket number for entry.
              </p>
              <Button asChild variant="outline">
                <Link to="/public-events">Back to Events</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
