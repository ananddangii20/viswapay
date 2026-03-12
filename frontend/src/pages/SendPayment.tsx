import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RefreshCw, User, DollarSign, Globe2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SendPayment = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("1000");
  const [checking, setChecking] = useState(false);

  const converted = (parseFloat(amount || "0") * 0.012).toFixed(2);

  const handleSend = () => {
    setChecking(true);
    setTimeout(() => {
      navigate("/fraud");
    }, 2000);
  };

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
              <Input placeholder="alice@example.com" className="pl-10 bg-muted/50 h-12" />
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
              <div className="h-12 bg-muted/50 border border-border rounded-lg flex items-center px-3 text-sm">
                🇮🇳 INR
              </div>
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
              <p className="text-lg font-bold text-secondary">${converted}</p>
              <p className="text-xs text-muted-foreground">Receiver gets</p>
            </div>
          </div>
        </motion.div>

        <Button
          onClick={handleSend}
          disabled={checking}
          className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-blue"
        >
          {checking ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking transaction safety using AI...
            </span>
          ) : (
            <>Send Payment <ArrowRight className="ml-2 w-4 h-4" /></>
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default SendPayment;
