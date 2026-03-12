import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const FraudAnalysis = () => {
  const navigate = useNavigate();
  const riskScore = 18;
  const isSafe = riskScore < 50;

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold font-display">AI Fraud Analysis</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        {/* Risk Score */}
        <div className="glass-card p-6 flex flex-col items-center glow-green">
          <Shield className={`w-12 h-12 mb-3 ${isSafe ? "text-success" : "text-destructive"}`} />
          <p className="text-sm text-muted-foreground mb-2">Transaction Risk Score</p>

          {/* Gauge */}
          <div className="relative w-40 h-20 mb-2">
            <svg viewBox="0 0 160 80" className="w-full h-full">
              <path d="M 10 75 A 65 65 0 0 1 150 75" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" strokeLinecap="round" />
              <motion.path
                d="M 10 75 A 65 65 0 0 1 150 75"
                fill="none"
                stroke={isSafe ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="204"
                initial={{ strokeDashoffset: 204 }}
                animate={{ strokeDashoffset: 204 - (204 * riskScore) / 100 }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-end justify-center pb-1">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-2xl font-bold font-display"
              >
                {riskScore}%
              </motion.span>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
            isSafe ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          }`}>
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{isSafe ? "Safe Transaction" : "High Risk — Review Needed"}</span>
          </div>
        </div>

        {/* Details */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Analysis Details</h3>
          {[
            { label: "Location Match", value: "✓ Normal", safe: true },
            { label: "Amount Pattern", value: "✓ Within range", safe: true },
            { label: "Device Trust", value: "✓ Known device", safe: true },
            { label: "Receiver History", value: "✓ Verified user", safe: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={item.safe ? "text-success" : "text-destructive"}>{item.value}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={() => navigate("/success")}
          className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-blue"
        >
          Proceed with Payment <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
};

export default FraudAnalysis;
