import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Globe2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BankComparisonModal, { type BankRate } from "@/components/BankComparisonModal";
import { useAuth } from "@/context/AuthContext";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import api from "@/lib/axios";
import { toast } from "sonner";

type FraudRiskLevel = "Low" | "Medium" | "High";

interface FraudRiskState {
  level: FraudRiskLevel;
  message: string;
  loading: boolean;
}

const currencyOptions = ["USD", "EUR", "GBP", "AED"];

const getFraudLevel = (riskValue: unknown): FraudRiskLevel => {
  if (typeof riskValue === "string") {
    const normalized = riskValue.toLowerCase();
    if (normalized === "high") return "High";
    if (normalized === "medium") return "Medium";
    return "Low";
  }

  const numericRisk = Number(riskValue);
  if (Number.isNaN(numericRisk)) return "Low";
  if (numericRisk >= 70) return "High";
  if (numericRisk >= 40) return "Medium";
  return "Low";
};

const getFraudStyles = (level: FraudRiskLevel) => {
  if (level === "High") {
    return {
      badgeClass: "bg-destructive/15 text-destructive",
      iconClass: "text-destructive",
    };
  }

  if (level === "Medium") {
    return {
      badgeClass: "bg-yellow-500/15 text-yellow-500",
      iconClass: "text-yellow-500",
    };
  }

  return {
    badgeClass: "bg-success/15 text-success",
    iconClass: "text-success",
  };
};

const normalizeBankRates = (rawData: unknown): BankRate[] => {
  const input = Array.isArray(rawData)
    ? rawData
    : Array.isArray((rawData as { rates?: unknown[] })?.rates)
      ? (rawData as { rates: unknown[] }).rates
      : [];

  return input
    .map((item, index) => {
      const source = item as {
        bankName?: string;
        bank?: string;
        exchangeRate?: number | string;
        rate?: number | string;
        convertedAmount?: number | string;
        converted?: number | string;
        processingFee?: number | string;
        fee?: number | string;
      };

      return {
        bankName: source.bankName ?? source.bank ?? `Bank ${index + 1}`,
        exchangeRate: Number(source.exchangeRate ?? source.rate ?? 0),
        convertedAmount: Number(source.convertedAmount ?? source.converted ?? 0),
        processingFee: Number(source.processingFee ?? source.fee ?? 0),
      };
    })
    .filter((rate) => rate.bankName && Number.isFinite(rate.exchangeRate));
};

const SendPayment = () => {
  const navigate = useNavigate();
  const { token, user, setAuthSession } = useAuth();
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("1000");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [bankRates, setBankRates] = useState<BankRate[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [fraudRisk, setFraudRisk] = useState<FraudRiskState | null>(null);

  const numericAmount = useMemo(() => Number(amount || "0"), [amount]);

  const {
    convertedAmount,
    loading: conversionLoading,
  } = useCurrencyConversion({
    amount,
    toCurrency: selectedCurrency,
    token,
  });

  const authHeaders = useMemo(() => ({
    Authorization: token ? `Bearer ${token}` : "",
  }), [token]);

  const fetchFraudRisk = useCallback(async (email: string, amountValue: number) => {
    try {
      const response = await api.get("/payment/fraud-check", {
        params: {
          email,
          amount: amountValue,
        },
        headers: authHeaders,
      });

      const data = response.data ?? {};
      const level = getFraudLevel((data as { level?: unknown; riskLevel?: unknown; score?: unknown }).riskLevel ?? (data as { level?: unknown }).level ?? (data as { score?: unknown }).score);

      setFraudRisk({
        level,
        message:
          (data as { message?: string }).message ??
          (level === "High"
            ? "High-risk transaction detected. Please review details carefully."
            : level === "Medium"
              ? "Moderate risk. Verify receiver and amount before paying."
              : "Transaction appears safe."),
        loading: false,
      });
    } catch {
      setFraudRisk(null);
    }
  }, [authHeaders]);

  useEffect(() => {
    const hasEmail = receiverEmail.trim().length > 0;
    if (!hasEmail || numericAmount <= 0) {
      setFraudRisk(null);
      return;
    }

    setFraudRisk((prev) => ({
      level: prev?.level ?? "Low",
      message: prev?.message ?? "Checking risk level...",
      loading: true,
    }));

    const timer = window.setTimeout(() => {
      void fetchFraudRisk(receiverEmail.trim(), numericAmount);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [receiverEmail, numericAmount, fetchFraudRisk]);

  const fetchBankRates = async () => {
    setRatesLoading(true);
    setBankRates([]);

    try {
      let rates: BankRate[] = [];

      try {
        const response = await api.get("/payment/bank-rates", {
          params: {
            amount: numericAmount,
            currency: selectedCurrency,
          },
          headers: authHeaders,
        });
        rates = normalizeBankRates(response.data);
      } catch {
        const fallbackResponse = await api.post(
          "/bank/compare",
          {
            amount: numericAmount,
            currency: selectedCurrency,
          },
          {
            headers: authHeaders,
          },
        );
        rates = normalizeBankRates(fallbackResponse.data);
      }

      setBankRates(rates);

      if (rates.length) {
        const cheapest = [...rates].sort(
          (a, b) =>
            a.processingFee - b.processingFee ||
            b.convertedAmount - a.convertedAmount,
        )[0];
        setSelectedBank(cheapest.bankName);
      }
    } catch {
      toast.error("Unable to load bank rates");
    } finally {
      setRatesLoading(false);
    }
  };

  const openBankComparison = async () => {
    if (!receiverEmail.trim()) {
      toast.error("Please enter receiver email");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setChecking(true);
    setShowBankModal(true);

    await fetchBankRates();

    setChecking(false);
  };

  const handleSend = async () => {
    if (!selectedBank) {
      toast.error("Please select a bank");
      return;
    }

    try {
      setSending(true);

      const response = await api.post(
        "/payment/send",
        {
          receiverEmail: receiverEmail.trim(),
          amount: numericAmount,
          currency: selectedCurrency,
          bankName: selectedBank,
        },
        {
          headers: authHeaders,
        },
      );

      // Update wallet balance in AuthContext immediately ✅
      const { senderBalance } = response.data;
      if (senderBalance !== undefined && user) {
        // Update user balance in context
        const updatedUser = { ...user, balance: senderBalance };
        setAuthSession(token!, updatedUser);
      }

      toast.success("Payment sent successfully");
      setShowBankModal(false);
      navigate("/dashboard");
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Payment failed";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const fraudStyles = fraudRisk ? getFraudStyles(fraudRisk.level) : null;

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold font-display">Send Payment</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        <div className="glass-card p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Receiver ID or Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="alice@example.com"
                value={receiverEmail}
                onChange={(e) => setReceiverEmail(e.target.value)}
                className="pl-10 bg-muted/50 h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 bg-muted/50 h-12"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Currency</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="h-12 w-full bg-muted/50 border border-border rounded-lg flex items-center px-3 text-sm"
              >
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Receiver's Country</label>
            <div className="relative">
              <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <div className="h-12 bg-muted/50 border border-border rounded-lg flex items-center pl-10 text-sm">
                🇺🇸 United States
              </div>
            </div>
          </div>

          {fraudRisk ? (
            <div className={`rounded-lg p-3 flex items-start gap-2 ${fraudStyles?.badgeClass}`}>
              {fraudRisk.level === "High" ? (
                <AlertTriangle className={`w-4 h-4 mt-0.5 ${fraudStyles?.iconClass}`} />
              ) : (
                <ShieldAlert className={`w-4 h-4 mt-0.5 ${fraudStyles?.iconClass}`} />
              )}
              <div>
                <p className="text-xs font-semibold">
                  Fraud Risk: {fraudRisk.loading ? "Checking..." : fraudRisk.level}
                </p>
                {!fraudRisk.loading ? (
                  <p className="text-xs opacity-90 mt-0.5">{fraudRisk.message}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Conversion Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 glow-teal"
        >
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-3 h-3 text-secondary" />
            <span className="text-xs text-secondary font-medium">Live Conversion</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">₹{amount || "0"}</p>
              <p className="text-xs text-muted-foreground">You send</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-lg font-bold text-secondary">
                {selectedCurrency} {convertedAmount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {conversionLoading ? "Updating..." : "Receiver gets"}
              </p>
            </div>
          </div>
        </motion.div>

        <Button
          onClick={openBankComparison}
          disabled={checking || sending}
          className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-blue"
        >
          {checking || sending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {checking ? "Loading best bank rates..." : "Sending payment..."}
            </span>
          ) : (
            <>Send Payment <ArrowRight className="ml-2 w-4 h-4" /></>
          )}
        </Button>

        <BankComparisonModal
          open={showBankModal}
          loading={ratesLoading || sending}
          rates={bankRates}
          selectedBank={selectedBank}
          onSelectBank={setSelectedBank}
          onClose={() => setShowBankModal(false)}
          onConfirm={handleSend}
        />
      </motion.div>
    </div>
  );
};

export default SendPayment;
