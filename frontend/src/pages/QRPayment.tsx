import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  QrCode,
  Copy,
  CheckCircle,
  Loader2,
  AlertCircle,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { toast } from "sonner";
import QRScannerModal from "@/components/QRScannerModal";

interface QRPaymentData {
  amount: number;
  currency: string;
  senderEmail: string;
  senderName: string;
  receiverEmail: string;
  timestamp: string;
  type: string;
}

interface QRCodeResult {
  image?: string;
  data: QRPaymentData;
  expiryTime: string;
}

const QRPayment = () => {
  const navigate = useNavigate();
  const { token: authToken, user, setAuthSession } = useAuth();

  // Sender mode state
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("1000");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCode, setQrCode] = useState<QRCodeResult | null>(null);

  // Receiver mode state
  const [scannedQRData, setScannedQRData] = useState<QRPaymentData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const getAuthHeaders = () => ({
    Authorization: authToken ? `Bearer ${authToken}` : "",
  });

  // Generate QR code for payment
  const handleGenerateQR = async () => {
    if (!receiverEmail.trim()) {
      toast.error("Please enter receiver email");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsGenerating(true);

      const response = await api.post(
        "/payment/qr-generate",
        {
          receiverEmail: receiverEmail.trim(),
          amount: Number(amount),
          currency: "INR",
        },
        { headers: getAuthHeaders() }
      );

      if (response.data?.qrCode) {
        setQrCode(response.data.qrCode);
        toast.success("QR code generated successfully!");
      }
    } catch (error: any) {
      console.error("QR generation error:", error);
      toast.error(
        error.response?.data?.message || "Failed to generate QR code"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy QR data to clipboard
  const handleCopyQRData = async () => {
    if (!qrCode?.data) return;

    try {
      const dataStr = JSON.stringify(qrCode.data);
      await navigator.clipboard.writeText(dataStr);
      toast.success("QR data copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  // Handle QR scan
  const handleQRScanned = (qrData: string) => {
    try {
      const parsed = JSON.parse(qrData);
      setScannedQRData(parsed);
      setShowScanner(false);
      toast.success("QR code scanned successfully!");
    } catch (error) {
      toast.error("Invalid QR code format");
    }
  };

  // Process QR payment (receiver)
  const handleProcessPayment = async () => {
    if (!scannedQRData) {
      toast.error("No QR data to process");
      return;
    }

    try {
      setIsProcessing(true);

      const response = await api.post(
        "/payment/qr-pay",
        { qrData: scannedQRData },
        { headers: getAuthHeaders() }
      );

      if (response.data?.success) {
        // Update balance in auth context
        if (user && response.data?.receiverBalance !== undefined) {
          const updatedUser = {
            ...user,
            balance: response.data.receiverBalance,
          };
          setAuthSession(authToken!, updatedUser);
        }

        setShowSuccess(true);
        toast.success("Payment processed successfully!");

        // Navigate to dashboard after delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(
        error.response?.data?.message || "Failed to process payment"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary" />
            QR Payment
          </h1>
          <p className="text-xs text-muted-foreground">
            {!scannedQRData ? "Generate or scan QR code" : "Confirm payment"}
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        {/* Show success state */}
        {showSuccess ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-8 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-success">
                ✨ Payment Successful!
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                ₹{scannedQRData?.amount} received from{" "}
                {scannedQRData?.senderName}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </motion.div>
        ) : (
          <>
            {/* Sender: Generate QR */}
            {!scannedQRData ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="glass-card p-5">
                  <h2 className="text-sm font-semibold mb-4">
                    📤 Generate Payment QR
                  </h2>

                  <div className="space-y-3">
                    {/* Receiver Email */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Receiver Email
                      </label>
                      <Input
                        type="email"
                        placeholder="receiver@example.com"
                        value={receiverEmail}
                        onChange={(e) => setReceiverEmail(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Amount (₹)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerateQR}
                      disabled={isGenerating || !receiverEmail || !amount}
                      className="w-full mt-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* QR Code Display */}
                {qrCode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-5 space-y-4"
                  >
                    <div className="space-y-2">
                      {qrCode.image && (
                        <>
                          <p className="text-xs font-medium text-muted-foreground">
                            Scan with camera
                          </p>
                          <img
                            src={qrCode.image}
                            alt="Payment QR Code"
                            className="w-full max-w-xs mx-auto bg-white/10 p-2 rounded-lg"
                          />
                        </>
                      )}

                      {/* Payment Details */}
                      <div className="bg-primary/10 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-semibold">
                            ₹{qrCode.data?.amount}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Receiver:
                          </span>
                          <span className="font-mono text-xs">
                            {qrCode.data?.receiverEmail}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Expires in:
                          </span>
                          <span className="text-secondary">15 minutes</span>
                        </div>
                      </div>

                      {/* Copy Data Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyQRData}
                        className="w-full"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Payment Code
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Receiver: Scan for Payment */}
                <div className="glass-card p-5 border-dashed border-2 border-primary/30">
                  <p className="text-xs text-muted-foreground mb-3">
                    📱 Or scan QR code as receiver
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setShowScanner(true)}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Confirm Scanned QR Payment */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="glass-card p-5 bg-primary/10 rounded-lg space-y-3">
                  <h2 className="text-sm font-semibold">✓ QR Received</h2>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">From:</span>
                      <span className="font-medium">
                        {scannedQRData?.senderName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-success">
                        ₹{scannedQRData?.amount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="text-xs">
                        {scannedQRData?.timestamp
                          ? new Date(scannedQRData.timestamp).toLocaleTimeString()
                          : "--"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScannedQRData(null);
                        setShowScanner(false);
                      }}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleProcessPayment}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        "Confirm"
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Security Info */}
        {!showSuccess && (
          <div className="glass-card p-3 flex items-start gap-3 bg-secondary/10">
            <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>🔒 <strong>Secure Payment:</strong> QR codes expire after 15 minutes</p>
              <p>✓ All transactions recorded on blockchain</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScanned}
      />
    </div>
  );
};

export default QRPayment;
