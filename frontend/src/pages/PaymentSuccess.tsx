import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Copy, ExternalLink, ArrowLeft, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const txHash = "0x7a3f...b82e1d4c";

  const copyHash = () => {
    navigator.clipboard.writeText("0x7a3f8c91d2e456b0a1c3d7e8f9012b34c567d890e1f2a3b4c5d6e7f8a9012b82e1d4c");
    toast.success("Hash copied to clipboard");
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="px-4 space-y-4"
      >
        {/* Success */}
        <div className="glass-card p-6 flex flex-col items-center text-center glow-green">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            <CheckCircle className="w-16 h-16 text-success mb-3" />
          </motion.div>
          <h2 className="text-xl font-bold font-display">Payment Successful!</h2>
          <p className="text-sm text-muted-foreground mt-1">Your money has been sent securely</p>
        </div>

        {/* Transaction Details */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Transaction Details</h3>
          {[
            { label: "Sender", value: "Arjun Patel" },
            { label: "Receiver", value: "Alice Johnson" },
            { label: "Amount", value: "₹1,000 → $12.00" },
            { label: "Date & Time", value: "Mar 11, 2026 · 2:45 PM" },
            { label: "Transaction ID", value: "VSP-TX-928471" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Blockchain */}
        <div className="glass-card p-4 space-y-3 glow-teal">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-semibold">Blockchain Record</h3>
          </div>
          {[
            { label: "Hash", value: txHash },
            { label: "Network", value: "ViswaPay Chain" },
            { label: "Status", value: "Verified ✓" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium font-mono text-xs">{item.value}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs border-secondary/30 text-secondary" onClick={copyHash}>
              <Copy className="w-3 h-3 mr-1" /> Copy Hash
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs border-secondary/30 text-secondary" onClick={() => navigate("/ledger")}>
              <ExternalLink className="w-3 h-3 mr-1" /> View Ledger
            </Button>
          </div>
        </div>

        <Button
          onClick={() => navigate("/dashboard")}
          className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-blue"
        >
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
