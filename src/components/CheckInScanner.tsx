import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Camera, CameraOff, Volume2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  enabled: boolean;
  onDetected: (ticketNumber: string) => void;
  isChecking: boolean;
}

export function CheckInScanner({ enabled, onDetected, isChecking }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);
  const [detectionTime, setDetectionTime] = useState<number>(0);
  const scanningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create a simple beep sound for detection feedback
  const playBeep = () => {
    // Create a simple sine wave beep using Web Audio API
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gain.gain.setValueAtTime(0.3, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to access camera";
      setCameraError(message);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
    }
  };

  // Scan video frames for QR codes
  useEffect(() => {
    if (!isCameraActive || !enabled) return;

    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.videoWidth === 0) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      try {
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        if (code) {
          const detectedValue = code.data;
          
          // Check if this is a new code (not the same one detected recently)
          if (detectedValue !== lastDetectedCode) {
            setLastDetectedCode(detectedValue);
            setDetectionTime(Date.now());
            playBeep();
            onDetected(detectedValue);
          }
        }
      } catch (error) {
        // Silently ignore detection errors
      }
    };

    scanningIntervalRef.current = setInterval(scanFrame, 100);

    return () => {
      if (scanningIntervalRef.current) {
        clearInterval(scanningIntervalRef.current);
      }
    };
  }, [isCameraActive, enabled, lastDetectedCode, onDetected]);

  // Reset detection after 2 seconds to allow rescanning
  useEffect(() => {
    if (!lastDetectedCode) return;
    const timeout = setTimeout(() => {
      setLastDetectedCode(null);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [lastDetectedCode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled && (
          <Alert>
            <AlertDescription>Select a competition first to enable camera scanning.</AlertDescription>
          </Alert>
        )}

        {cameraError && (
          <Alert variant="destructive">
            <AlertDescription>{cameraError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {isCameraActive && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-green-500 rounded-lg flex items-center justify-center pointer-events-none">
                <div className="border-2 border-green-500 w-32 h-32 rounded-lg" />
              </div>
            </div>
          )}

          {!isCameraActive && !enabled && (
            <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
              <div className="text-center">
                <CameraOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Camera disabled</p>
              </div>
            </div>
          )}

          {!isCameraActive && enabled && (
            <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click "Start Camera" to begin</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={isCameraActive ? stopCamera : startCamera}
              disabled={!enabled}
              variant={isCameraActive ? "destructive" : "default"}
              className="flex-1"
            >
              {isCameraActive ? (
                <>
                  <CameraOff className="h-4 w-4 mr-2" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </>
              )}
            </Button>
          </div>

          {isChecking && (
            <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700 dark:text-blue-300">Processing scan...</span>
            </div>
          )}

          {lastDetectedCode && !isChecking && (
            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
              <Volume2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">QR code detected!</span>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Point your device's camera at a ticket QR code. The system will automatically detect and check in the ticket.
        </p>
      </CardContent>
    </Card>
  );
}
