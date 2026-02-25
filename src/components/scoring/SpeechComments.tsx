import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff } from "lucide-react";

interface SpeechCommentsProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SpeechComments({ value, onChange, disabled = false }: SpeechCommentsProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        // Append to existing
        onChange(value + (value ? " " : "") + transcript);
      };

      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Comments</label>
        {supported && (
          <Button
            type="button"
            variant={listening ? "destructive" : "outline"}
            size="sm"
            onClick={toggleListening}
            disabled={disabled}
          >
            {listening ? <MicOff className="h-3.5 w-3.5 mr-1" /> : <Mic className="h-3.5 w-3.5 mr-1" />}
            {listening ? "Stop" : "Dictate"}
          </Button>
        )}
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="General feedback on the performance…"
        rows={3}
        disabled={disabled}
        className={listening ? "border-destructive/50" : ""}
      />
      {listening && (
        <p className="text-xs text-destructive animate-pulse">🎙 Listening… speak now</p>
      )}
    </div>
  );
}
