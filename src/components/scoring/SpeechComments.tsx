import { useState, useEffect, useRef, useCallback } from "react";
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
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef(value);
  const finalizedRef = useRef("");

  // Keep baseTextRef in sync when value changes externally (not from speech)
  useEffect(() => {
    if (!isListeningRef.current) {
      baseTextRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setSupported(true);
  }, []);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let newFinal = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          newFinal += transcript;
        } else {
          interim += transcript;
        }
      }

      // Update finalized text from this recognition session
      if (newFinal) {
        finalizedRef.current = newFinal;
        const separator = baseTextRef.current ? " " : "";
        onChange(baseTextRef.current + separator + newFinal.trim());
      }

      setInterimText(interim);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        // Auto-restart after silence timeout
        try { recognition.start(); } catch { /* already started */ }
      } else {
        setListening(false);
        setInterimText("");
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return; // normal, will auto-restart via onend
      console.error("Speech recognition error:", event.error);
      isListeningRef.current = false;
      setListening(false);
      setInterimText("");
    };

    return recognition;
  }, [onChange]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }
    if (!recognitionRef.current) return;

    baseTextRef.current = value;
    finalizedRef.current = "";
    isListeningRef.current = true;
    setListening(true);
    setInterimText("");
    try { recognitionRef.current.start(); } catch { /* already started */ }
  }, [value, initRecognition]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setListening(false);
    setInterimText("");
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  // Keyboard shortcut
  const toggleRef = useRef(toggleListening);
  useEffect(() => { toggleRef.current = toggleListening; }, [toggleListening]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (disabled || !supported) return;
      if (e.key.toLowerCase() === "d") {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          toggleRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      isListeningRef.current = false;
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, [disabled, supported]);

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
        value={interimText ? `${value} ${interimText}`.trim() : value}
        onChange={e => { if (!listening) onChange(e.target.value); }}
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