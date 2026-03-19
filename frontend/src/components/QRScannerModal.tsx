import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
}

declare global {
  interface Window {
    QRScanner?: any;
  }
}

export const QRScannerModal = ({
  isOpen,
  onClose,
  onScan,
}: QRScannerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err);
          setCameraError("Unable to access camera. Please check permissions.");
        });
      }

      // Start QR detection loop
      detectQR();
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        "Cannot access camera. Please grant camera permissions and try again."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const detectQR = async () => {
    if (!canvasRef.current || !videoRef.current || !isOpen) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d");

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(detectQR);
      return;
    }

    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Use BarcodeDetector API if available (modern browsers)
      if ("BarcodeDetector" in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });

          const barcodes = await barcodeDetector.detect(imageData);
          if (barcodes.length > 0) {
            const qrValue = barcodes[0].rawValue;
            if (qrValue && qrValue.trim()) {
              toast.success("QR code detected!");
              onScan(qrValue.trim().toUpperCase());
              stopCamera();
              onClose();
              return;
            }
          }
        } catch (err) {
          console.error("BarcodeDetector error:", err);
        }
      }
    } catch (err) {
      console.error("QR detection error:", err);
    }

    // Continue scanning
    requestAnimationFrame(detectQR);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="bg-card rounded-3xl max-w-md w-full overflow-hidden border border-primary/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Scan Token</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {cameraError ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive mb-1">
                      Camera Error
                    </p>
                    <p className="text-xs text-destructive/80">{cameraError}</p>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Video Container */}
                  <div className="relative bg-black rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      autoPlay
                      muted
                    />

                    {/* Scanning Frame Overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-48 h-48 border-2 border-primary rounded-lg">
                          {/* Corner brackets */}
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

                          {/* Scanning line animation */}
                          <motion.div
                            animate={{ y: [-96, 96] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                          />
                        </div>
                      </div>
                    )}

                    {/* Loading indicator */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-primary font-semibold bg-black/50 px-2 py-1 rounded">
                        Scanning...
                      </span>
                    </div>
                  </div>

                  {/* Hidden canvas for QR detection */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Instructions */}
                  <div className="bg-secondary/10 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-secondary">
                      How to scan:
                    </p>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5">
                      <li>• Hold your device steady</li>
                      <li>• Center the QR code in the frame</li>
                      <li>• Token will auto-detect and fill</li>
                    </ul>
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                {cameraError && (
                  <Button
                    onClick={() => {
                      startCamera();
                    }}
                    className="flex-1 h-10"
                    variant="outline"
                  >
                    Retry Camera
                  </Button>
                )}
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className={`h-10 ${cameraError ? "" : "w-full"}`}
                >
                  Cancel
                </Button>
              </div>

              {/* Manual Entry Fallback */}
              <p className="text-[11px] text-muted-foreground text-center pt-2 border-t border-border">
                Camera not available? Use manual token entry instead.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRScannerModal;
