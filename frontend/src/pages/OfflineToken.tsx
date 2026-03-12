import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Wifi, Clock, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const OfflineToken = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);

  const generateToken = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = "VSP-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setToken(code);
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success("Token copied!");
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold font-display">Offline Token</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        <div className="glass-card p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-success/15 flex items-center justify-center mb-4">
            <Wifi className="w-7 h-7 text-success" />
          </div>
          <h2 className="text-lg font-bold font-display mb-1">Offline Payments</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a one-time token to make payments even without internet. The transaction will sync when you're back online.
          </p>

          {!token ? (
            <Button
              onClick={generateToken}
              className="gradient-primary text-primary-foreground font-semibold h-12 px-8 glow-blue"
            >
              Generate Offline Token
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-4"
            >
              <div className="glass-card p-4 glow-green">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm font-semibold text-success">Token Generated</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center">
                  <span className="text-2xl font-bold font-mono tracking-widest">{token}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToken}
                  className="w-full mt-3 text-xs text-primary"
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy Token
                </Button>
              </div>

              <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Expires in 24 hours</span>
              </div>

              <div className="glass-card p-3">
                <p className="text-xs text-muted-foreground text-center">
                  Share this token with the receiver. Once both devices are online, the payment will be verified and recorded on the blockchain.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={generateToken}
                className="w-full border-primary/30 text-primary"
              >
                Generate New Token
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OfflineToken;
