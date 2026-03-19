import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wifi,
  Clock,
  Copy,
  CheckCircle,
  Loader2,
  WifiOff,
  AlertCircle,
  Shield,
  RefreshCw,
  Camera,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { toast } from "sonner";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import OfflinePaymentSuccessModal from "@/components/OfflinePaymentSuccessModal";
import QRScannerModal from "@/components/QRScannerModal";

interface TokenPreview {
  token: string;
  expiry: Date;
  expirySeconds: number;
  qrPayload: string;
  amount: number;
  currency: string;
  receiver: string;
}

interface PendingRedeem {
  token: string;
  timestamp: number;
}

type OfflineMode = "sender" | "receiver";

const OfflineToken = () => {
  const navigate = useNavigate();
  const { token: authToken, user, setAuthSession } = useAuth();

  // Mode State
  const [mode, setMode] = useState<OfflineMode>("sender");

  // Sender UI State
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("1000");
  const [currency, setCurrency] = useState("INR");
  const [bankName, setBankName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<TokenPreview | null>(
    null
  );

  // Receiver UI State
  const [manualToken, setManualToken] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [successData, setSuccessData] = useState<{
    transactionId: string;
    blockchainHash: string;
    amount: number;
    currency: string;
    receiver: string;
    timestamp: string;
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Offline state
  const { isOnline, wasOffline, justCameOnline } = useOfflineDetection(
    () => {
      toast.error("You are now offline. Tokens can still be redeemed when online.");
    },
    () => {
      toast.success("You are back online!");
      // Auto-retry pending redeems if needed
      retryPendingRedeems();
    }
  );

  // Countdown timer
  const countdown = useCountdownTimer(
    generatedToken?.expiry || new Date(),
    generatedToken?.expirySeconds
  );

  const getAuthHeaders = () => ({
    Authorization: authToken ? `Bearer ${authToken}` : "",
  });

  // Offline queue management
  const [pendingRedeems, setPendingRedeems] = useState<PendingRedeem[]>([]);

  const savePendingRedeem = (token: string) => {
    const pending = {
      token,
      timestamp: Date.now()
    };
    const stored = JSON.parse(localStorage.getItem("pendingRedeems") || "[]");
    stored.push(pending);
    localStorage.setItem("pendingRedeems", JSON.stringify(stored));
    setPendingRedeems(stored);
  };

  const retryPendingRedeems = async () => {
    const stored = JSON.parse(localStorage.getItem("pendingRedeems") || "[]");
    if (stored.length === 0) return;

    console.log(`[Offline Queue] Retrying ${stored.length} pending redemptions...`);
    for (const pending of stored) {
      try {
        await verifyTokenRequest(pending.token);
        // Remove from queue if successful
        const updated = stored.filter((p: PendingRedeem) => p.token !== pending.token);
        localStorage.setItem("pendingRedeems", JSON.stringify(updated));
        setPendingRedeems(updated);
      } catch (error) {
        console.error(`[Offline Queue] Failed to redeem ${pending.token}`);
      }
    }
  };

  const generateToken = async () => {
    if (!receiverEmail.trim()) {
      toast.error("Enter receiver email");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      setIsGenerating(true);

      let response;
      try {
        response = await api.post(
          "/token/generate",
          {
            receiverEmail: receiverEmail.trim(),
            amount: Number(amount),
            currency,
            bankName: bankName.trim() || undefined,
          },
          { headers: getAuthHeaders() }
        );
      } catch (error) {
        throw error;
      }

      const data = response.data?.data || response.data;
      const tokenValue = data.token;

      if (!tokenValue) {
        throw new Error("Token not received");
      }

      setGeneratedToken({
        token: tokenValue,
        expiry: new Date(data.expiry),
        expirySeconds: data.expirySeconds || 300,
        qrPayload: data.qrPayload,
        amount: data.amount,
        currency: data.currency,
        receiver: data.receiver,
      });

      toast.success("Offline token generated! ✨");
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Token generation failed";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyTokenRequest = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      toast.error("Enter token code");
      return;
    }

    try {
      setIsVerifying(true);

      let response;
      try {
        response = await api.post(
          "/token/redeem",
          { token: tokenToVerify.trim() },
          { headers: getAuthHeaders() }
        );
      } catch (error) {
        throw error;
      }

      const responseData = response.data;
      const data = responseData?.data || response.data;

      // Verify token matched successfully
      if (responseData?.tokenMatched === true || responseData?.success === true) {
        // Update balance in AuthContext
        if (user && responseData?.receiverBalance !== undefined) {
          const updatedUser = {
            ...user,
            balance: responseData.receiverBalance,
          };
          setAuthSession(authToken!, updatedUser);
        }

        // Show success modal
        setSuccessData({
          transactionId: data.transactionId || data.id,
          blockchainHash: data.blockchainHash,
          amount: data.amount,
          currency: data.currency,
          receiver: data.receiver,
          timestamp: new Date().toISOString(),
        });

        setShowSuccessModal(true);
        toast.success("Token matched successfully! Payment secured 🎉");

        // Reset receiver form after delay
        setTimeout(() => {
          setManualToken("");
        }, 2000);

        // Auto navigate to dashboard after success
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      }
    } catch (error) {
      const errorResponse = (error as { response?: { data?: any } })?.response
        ?.data;
      const errorMsg = errorResponse?.message || "Token verification failed";
      const errorType = errorResponse?.errorType;

      const errorDetails = getErrorDetails(errorType, errorMsg);

      if (!isOnline) {
        toast.error("You are offline. Payment queued for later.");
        savePendingRedeem(tokenToVerify);
      } else {
        toast.error(errorDetails);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const getErrorDetails = (
    errorType: string | undefined,
    fallback: string
  ): string => {
    switch (errorType) {
      case "TOKEN_MISMATCH":
        return "❌ Token not found - Check the code and try again";
      case "TOKEN_EXPIRED":
        return "⏰ Token has expired - Please generate a new one";
      case "TOKEN_ALREADY_USED":
        return "🔄 Token already redeemed - Cannot use twice";
      case "INSUFFICIENT_BALANCE":
        return "💸 Sender has insufficient balance";
      case "UNAUTHORIZED_RECEIVER":
        return "🚫 You are not the intended receiver";
      case "USER_NOT_FOUND":
        return "👤 User account not found";
      case "MISSING_TOKEN":
        return "📝 Please enter a token code";
      case "SERVER_ERROR":
        return "⚠️ Server error - Please try again later";
      default:
        return fallback;
    }
  };

  const handleRedeemClick = () => {
    verifyTokenRequest(manualToken);
  };

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken.token);
      toast.success("Token copied!");
    }
  };

  const copyQRPayload = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken.qrPayload);
      toast.success("QR payload copied!");
    }
  };

  const generateNewToken = () => {
    setGeneratedToken(null);
    setReceiverEmail("");
    setAmount("1000");
    setCurrency("INR");
    setBankName("");
  };

  // ==================== RECEIVER MODE ====================

  const handleQRScanned = (scannedToken: string) => {
    setManualToken(scannedToken.toUpperCase());
    toast.success("QR code scanned!");
  };

  return (
    <div className="min-h-screen pb-8 relative">
      {/* Network Status Bar */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-40 bg-red-500/10 border-b border-red-500/30 px-4 py-3"
          >
            <div className="flex items-center gap-2 text-red-600 max-w-md mx-auto">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-semibold">
                You are offline. Tokens will sync when online.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Queue Status */}
      <AnimatePresence>
        {pendingRedeems.length > 0 && isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-14 left-0 right-0 z-40 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2"
          >
            <div className="flex items-center gap-2 text-amber-600 max-w-md mx-auto">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-xs font-semibold">
                {pendingRedeems.length} payment(s) syncing...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={`px-4 pt-6 pb-4 flex items-center justify-between ${
        !isOnline ? "mt-12" : ""
      }`}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold font-display">Offline Payment</h1>
        </div>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-success" />
              <span className="text-xs text-success font-semibold">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-destructive animate-pulse" />
              <span className="text-xs text-destructive font-semibold">
                Offline
              </span>
            </>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        {/* Mode Tabs */}
        <div className="flex gap-2 bg-secondary/20 p-1 rounded-lg">
          <button
            onClick={() => {
              setMode("sender");
              setManualToken("");
            }}
            className={`flex-1 py-2 px-3 rounded-md font-semibold text-sm transition-all ${
              mode === "sender"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Send className="w-4 h-4 inline mr-1" />
            Generate
          </button>
          <button
            onClick={() => {
              setMode("receiver");
              setGeneratedToken(null);
              setReceiverEmail("");
            }}
            className={`flex-1 py-2 px-3 rounded-md font-semibold text-sm transition-all ${
              mode === "receiver"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-1" />
            Redeem
          </button>
        </div>

        {/* ==================== SENDER MODE ==================== */}
        {mode === "sender" && (
          <motion.div
            key="sender"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold font-display">Generate Token</h2>
              <p className="text-sm text-muted-foreground">
                Create a one-time payment token
              </p>
            </div>

            {!generatedToken ? (
              // Token Generation Form
              <div className="space-y-3">
                <Input
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  className="bg-muted/50 h-11"
                  placeholder="Receiver email"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    className="bg-muted/50 h-11"
                    placeholder="Amount"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-muted/50 h-11 rounded-md px-3 text-sm border border-border"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="bg-muted/50 h-11"
                  placeholder="Bank name (optional)"
                />

                <Button
                  onClick={generateToken}
                  disabled={
                    isGenerating ||
                    !receiverEmail.trim() ||
                    !amount ||
                    Number(amount) <= 0
                  }
                  className="w-full h-12 gradient-primary font-semibold"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    "Generate Token"
                  )}
                </Button>
              </div>
            ) : (
              // Token Display Section
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Token Generated Badge */}
                <div className="bg-success/10 border border-success/30 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm font-semibold text-success">
                    Token Generated
                  </span>
                </div>

                {/* QR Code with Countdown */}
                <div className="flex justify-center">
                  <div className="relative">
                    <motion.img
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        generatedToken.qrPayload
                      )}`}
                      alt="Offline token QR"
                      className="w-40 h-40 rounded-xl border-2 border-primary/30 bg-white p-2"
                    />

                    {/* Countdown Badge */}
                    <motion.div
                      className={`absolute -bottom-3 -right-3 w-14 h-14 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                        countdown.progressPercent > 50
                          ? "bg-success"
                          : countdown.progressPercent > 25
                            ? "bg-amber-500"
                            : "bg-destructive"
                      } text-white shadow-lg border-4 border-card`}
                      animate={{ scale: countdown.isExpired ? [1, 1.1, 1] : 1 }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      {countdown.displayText}
                    </motion.div>
                  </div>
                </div>

                {/* Token Code Display */}
                <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center">
                  <span className="text-2xl font-bold font-mono tracking-widest">
                    {generatedToken.token}
                  </span>
                </div>

                {/* Copy Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToken}
                    className="text-xs h-9"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyQRPayload}
                    className="text-xs h-9"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy QR
                  </Button>
                </div>

                {/* Security Info */}
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 bg-primary/10 rounded-lg py-1.5 px-2 border border-primary/20">
                    <Shield className="w-3 h-3 text-primary inline mr-1" />
                    <span className="text-primary font-semibold">Encrypted</span>
                  </div>
                  <div className="flex-1 bg-success/10 rounded-lg py-1.5 px-2 border border-success/20">
                    <Wifi className="w-3 h-3 text-success inline mr-1" />
                    <span className="text-success font-semibold">Blockchain</span>
                  </div>
                </div>

                {/* Expiry Warnings */}
                {countdown.progressPercent <= 25 && !countdown.isExpired && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-amber-700 font-semibold">
                      Token expires soon!
                    </span>
                  </motion.div>
                )}

                {countdown.isExpired && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 flex gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-destructive font-semibold">
                      Token has expired. Generate a new one.
                    </span>
                  </motion.div>
                )}

                {/* Generate New Token */}
                <Button
                  variant="outline"
                  onClick={generateNewToken}
                  className="w-full"
                >
                  Generate New Token
                </Button>
              </motion.div>
            )}

            {/* Info Card */}
            <div className="bg-secondary/10 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground flex gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>
                  Share the token or QR code with receiver (valid for 5 mins)
                </span>
              </p>
            </div>
          </motion.div>
        )}

        {/* ==================== RECEIVER MODE ==================== */}
        {mode === "receiver" && (
          <motion.div
            key="receiver"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold font-display">Receive Payment</h2>
              <p className="text-sm text-muted-foreground">
                Enter or scan the token code
              </p>
            </div>

            {/* Token Input */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground block">
                Token Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                  className="bg-muted/50 h-11 font-mono text-center text-lg letter-spacing flex-1"
                  placeholder="e.g., ABC123"
                  disabled={isVerifying}
                />
                <Button
                  onClick={() => setShowQRScanner(true)}
                  variant="outline"
                  size="icon"
                  className="h-11"
                  title="Scan QR Code"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Redeem Button */}
            <Button
              onClick={handleRedeemClick}
              disabled={isVerifying || !manualToken.trim()}
              className="w-full h-12 gradient-primary font-semibold"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Redeem Token
                </>
              )}
            </Button>

            {/* Info Card */}
            <div className="bg-secondary/10 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground flex gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>
                  {isOnline
                    ? "Payment will be processed immediately"
                    : "Payment will be queued and sent when online"}
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScanned}
      />

      {/* Success Modal */}
      <OfflinePaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        transactionData={successData}
      />
    </div>
  );
};

export default OfflineToken;
