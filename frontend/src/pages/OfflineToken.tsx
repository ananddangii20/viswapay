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
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { toast } from "sonner";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import OfflinePaymentSuccessModal from "@/components/OfflinePaymentSuccessModal";

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

const OfflineToken = () => {
  const navigate = useNavigate();
  const { token: authToken, user, setAuthSession } = useAuth();

  // UI State
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("1000");
  const [currency, setCurrency] = useState("INR");
  const [bankName, setBankName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<TokenPreview | null>(
    null
  );
  const [manualToken, setManualToken] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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

      // Try primary endpoint first
      let response;
      try {
        response = await api.post(
          "/payment/generate-token",
          {
            receiverEmail: receiverEmail.trim(),
            amount: Number(amount),
            currency,
            bankName: bankName.trim() || undefined
          },
          { headers: getAuthHeaders() }
        );
      } catch {
        // Fallback to token endpoint
        response = await api.post(
          "/token/generate",
          {
            receiverEmail: receiverEmail.trim(),
            amount: Number(amount),
            currency,
            bankName: bankName.trim() || undefined
          },
          { headers: getAuthHeaders() }
        );
      }

      const data = response.data?.data || response.data;
      const tokenValue = data.token;

      if (!tokenValue) {
        throw new Error("Token not received");
      }

      // Set token preview with countdown data
      setGeneratedToken({
        token: tokenValue,
        expiry: new Date(data.expiry),
        expirySeconds: data.expirySeconds || 300,
        qrPayload: data.qrPayload,
        amount: data.amount,
        currency: data.currency,
        receiver: data.receiver
      });

      setManualToken(tokenValue);
      toast.success("Offline token generated! ✨");
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Token generation failed";
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

      // Try primary endpoint first
      let response;
      try {
        response = await api.post(
          "/payment/verify-token",
          { token: tokenToVerify.trim() },
          { headers: getAuthHeaders() }
        );
      } catch {
        // Fallback to token endpoint
        response = await api.post(
          "/token/redeem",
          { token: tokenToVerify.trim() },
          { headers: getAuthHeaders() }
        );
      }

      const responseData = response.data;
      const data = responseData?.data || response.data;

      // Verify token matched successfully
      if (responseData?.tokenMatched === true || responseData?.success === true) {
        // Update user balance in AuthContext if we're the receiver
        if (user && responseData?.receiverBalance !== undefined) {
          const updatedUser = { ...user, balance: responseData.receiverBalance };
          setAuthSession(authToken!, updatedUser);
        }

        // Show success with blockchain hash
        setSuccessData({
          transactionId: data.transactionId || data.id,
          blockchainHash: data.blockchainHash,
          amount: data.amount,
          currency: data.currency,
          receiver: data.receiver,
          timestamp: new Date().toISOString()
        });

        setShowSuccessModal(true);
        toast.success("Token matched successfully! Payment secured on blockchain 🎉");

        // Reset form after short delay
        setTimeout(() => {
          setGeneratedToken(null);
          setManualToken("");
          setReceiverEmail("");
          setAmount("1000");
        }, 2000);
      }
    } catch (error) {
      const errorResponse = (error as { response?: { data?: any } })?.response?.data;
      const errorMsg = errorResponse?.message || "Token verification failed";
      const errorType = errorResponse?.errorType;

      // Provide differentiated error messages based on error type
      const errorDetails = getErrorDetails(errorType, errorMsg);

      if (!isOnline) {
        toast.error("You are offline. Payment queued for later.");
        savePendingRedeem(tokenToVerify);
      } else {
        // Show detailed error with appropriate emotion
        toast.error(errorDetails);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const getErrorDetails = (errorType: string | undefined, fallback: string): string => {
    switch (errorType) {
      case "TOKEN_MISMATCH":
        return "❌ Token not found - Check the code and try again";
      case "TOKEN_EXPIRED":
        return "⏰ Token has expired - Please generate a new one";
      case "TOKEN_ALREADY_USED":
        return "🔄 Token already redeemed - Cannot use twice";
      case "INSUFFICIENT_BALANCE":
        return "💸 Sender has insufficient balance - Transaction cannot be completed";
      case "UNAUTHORIZED_RECEIVER":
        return "🚫 You are not the intended receiver of this token";
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

  const verifyToken = async () => {
    await verifyTokenRequest(manualToken);
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
    setManualToken("");
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
                You are offline. Payments will sync when online.
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
            <div className="flex items-center justify-between max-w-md mx-auto">
              <div className="flex items-center gap-2 text-amber-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-xs font-semibold">
                  {pendingRedeems.length} pending payment(s) syncing...
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={`px-4 pt-6 pb-4 flex items-center gap-3 ${!isOnline ? "mt-12" : ""}`}>
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold font-display">Offline Token</h1>
        <div className="ml-auto flex items-center gap-1">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-success" />
              <span className="text-xs text-success font-semibold">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-destructive animate-pulse" />
              <span className="text-xs text-destructive font-semibold">Offline</span>
            </>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        {/* Main Card */}
        <div className="glass-card p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-success/15 flex items-center justify-center mb-4">
            <Wifi className="w-7 h-7 text-success" />
          </div>
          <h2 className="text-lg font-bold font-display mb-1">Offline Payments</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a one-time token to make payments even without internet. Your transaction will be secured on the blockchain.
          </p>

          {/* Token Generation Form */}
          {!generatedToken ? (
            <div className="w-full space-y-3">
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
                disabled={isGenerating}
                className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-blue"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  "Generate Offline Token"
                )}
              </Button>
            </div>
          ) : (
            // Token Display Section
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-4"
            >
              {/* Token Generated Card */}
              <div className="glass-card p-4 glow-green border border-success/30">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm font-semibold text-success">
                    Token Generated
                  </span>
                </div>

                {/* QR Code with Live Countdown */}
                <div className="relative mb-4 flex justify-center">
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
                      className={`absolute -bottom-3 -right-3 w-16 h-16 rounded-full flex items-center justify-center font-bold font-mono text-sm font-display ${
                        countdown.progressPercent > 50
                          ? "bg-gradient-to-br from-success to-success/80"
                          : countdown.progressPercent > 25
                            ? "bg-gradient-to-br from-amber-500 to-amber-600"
                            : "bg-gradient-to-br from-destructive to-destructive/80"
                      } text-white shadow-lg border-4 border-card`}
                      animate={{
                        scale: countdown.isExpired ? [1, 1.1, 1] : 1
                      }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      {countdown.displayText}
                    </motion.div>
                  </div>
                </div>

                {/* Token Code Display */}
                <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold font-mono tracking-widest">
                    {generatedToken.token}
                  </span>
                </div>

                {/* Copy and Share Actions */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToken}
                    className="text-xs h-9"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyQRPayload}
                    className="text-xs h-9"
                  >
                    <Copy className="w-3 h-3 mr-1" /> QR Data
                  </Button>
                </div>

                {/* Security Indicators */}
                <div className="flex gap-1 text-xs mb-3">
                  <div className="flex-1 bg-primary/10 rounded-lg py-2 px-2 border border-primary/20">
                    <Shield className="w-3 h-3 text-primary inline mr-1" />
                    <span className="text-primary font-semibold">Encrypted</span>
                  </div>
                  <div className="flex-1 bg-success/10 rounded-lg py-2 px-2 border border-success/20">
                    <Wifi className="w-3 h-3 text-success inline mr-1" />
                    <span className="text-success font-semibold">Secured</span>
                  </div>
                </div>

                {/* Expiry Warning */}
                {countdown.progressPercent <= 25 && !countdown.isExpired && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex gap-2 items-start"
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
                    className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 flex gap-2 items-start"
                  >
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-destructive font-semibold">
                      Token has expired. Generate a new one.
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Redemption Section */}
              <div className="glass-card p-4 space-y-3">
                <label className="text-xs text-muted-foreground font-semibold block">
                  Manual Code Entry (for receiver)
                </label>
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                  className="bg-muted/50 h-11 font-mono text-center text-lg letter-spacing"
                  placeholder="Enter token code"
                  disabled={countdown.isExpired}
                />
                <Button
                  onClick={verifyToken}
                  disabled={isVerifying || countdown.isExpired || !manualToken.trim()}
                  className="w-full h-10 gradient-primary text-primary-foreground font-semibold"
                >
                  {isVerifying ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Redeem Token"
                  )}
                </Button>
              </div>

              {/* Generate New Token Button */}
              <Button
                variant="outline"
                onClick={generateNewToken}
                className="w-full border-primary/30 text-primary"
              >
                Generate New Token
              </Button>
            </motion.div>
          )}
        </div>

        {/* Info Card */}
        {generatedToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-3 space-y-2"
          >
            <p className="text-xs text-muted-foreground text-left">
              <Clock className="w-3 h-3 inline mr-1" />
              Share this token with the receiver. Payments can be redeemed when both devices are online. Your transaction is secured on the blockchain with SHA256 hashing.
            </p>
          </motion.div>
        )}
      </motion.div>

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
