import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, AlertCircle, Zap } from "lucide-react";

interface FraudReason {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
}

interface AIFraudHeatmapProps {
  score: number;
  reasons: FraudReason[];
  level: "LOW" | "MEDIUM" | "HIGH";
}

const AIFraudHeatmap = ({ score, reasons = [], level }: AIFraudHeatmapProps) => {
  // Determine color zone
  const getColorZone = (s: number) => {
    if (s < 30) return { zone: "SAFE", color: "success", bgColor: "bg-success/10", borderColor: "border-success/30" };
    if (s < 70) return { zone: "CAUTION", color: "warning", bgColor: "bg-warning/10", borderColor: "border-warning/30" };
    return { zone: "HIGH RISK", color: "destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30" };
  };

  const zoneInfo = getColorZone(score);
  const isHighRisk = score >= 70;

  // Color map for risk zones (gradient)
  const gaugeColor = useMemo(() => {
    if (score < 30) return "hsl(var(--success))";
    if (score < 70) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  }, [score]);

  // Calculate gauge stroke
  const gaugePercentage = score / 100;
  const circumference = 2 * Math.PI * 45; // radius 45
  const strokeDashoffset = circumference * (1 - gaugePercentage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass-card p-6 border-2 transition-all ${zoneInfo.bgColor} ${zoneInfo.borderColor}`}
    >
      {/* Animated pulse indicator for high risk */}
      {isHighRisk && (
        <motion.div
          className="absolute top-4 right-4 w-3 h-3 rounded-full bg-destructive"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        {score < 30 ? (
          <CheckCircle className="w-5 h-5 text-success" />
        ) : score < 70 ? (
          <AlertCircle className="w-5 h-5 text-warning" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
        )}
        <h3 className="text-sm font-semibold">AI Fraud Heatmap</h3>
      </div>

      {/* Risk Score Gauge */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-40 h-40 flex items-center justify-center mb-4">
          {/* Outer ring (background) */}
          <svg className="absolute w-full h-full" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Color zone backgrounds */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="hsl(var(--success)/0.3)"
              strokeWidth="3"
              strokeDasharray={circumference * 0.3}
              strokeDashoffset="0"
              strokeLinecap="round"
              opacity="0.5"
            />
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="hsl(var(--warning)/0.3)"
              strokeWidth="3"
              strokeDasharray={circumference * 0.4}
              strokeDashoffset={-(circumference * 0.3)}
              strokeLinecap="round"
              opacity="0.5"
            />
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="hsl(var(--destructive)/0.3)"
              strokeWidth="3"
              strokeDasharray={circumference * 0.3}
              strokeDashoffset={-(circumference * 0.7)}
              strokeLinecap="round"
              opacity="0.5"
            />

            {/* Animated score indicator */}
            <motion.circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: strokeDashoffset }}
              transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
            />

            {/* Glow effect for high risk */}
            {isHighRisk && (
              <>
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.3"
                  filter="url(#glow)"
                />
              </>
            )}

            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          {/* Center score display */}
          <div className="flex flex-col items-center z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="relative"
            >
              <div className="text-4xl font-bold font-display text-center">{Math.round(score)}</div>
              <div className="text-xs text-muted-foreground text-center">/ 100</div>
            </motion.div>
          </div>

          {/* Zone labels */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="text-center">
              <span className="text-[10px] font-semibold text-success px-2">SAFE</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-semibold text-destructive px-2">HIGH RISK</span>
            </div>
          </div>
        </div>

        {/* Zone indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
            zoneInfo.color === "success"
              ? "bg-success/20 text-success"
              : zoneInfo.color === "warning"
              ? "bg-warning/20 text-warning"
              : "bg-destructive/20 text-destructive"
          }`}
        >
          {isHighRisk && <Zap className="w-3 h-3" />}
          {zoneInfo.zone}
        </motion.div>
      </div>

      {/* Risk Reasons */}
      <div className="space-y-3 pt-4 border-t border-muted/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk Factors</p>

        {(reasons || []).length > 0 ? (
          <div className="space-y-2">
            {reasons.map((reason, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + idx * 0.05 }}
                className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                  reason.severity === "high"
                    ? "bg-destructive/5 border-destructive/20"
                    : reason.severity === "medium"
                    ? "bg-warning/5 border-warning/20"
                    : "bg-success/5 border-success/20"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    reason.severity === "high"
                      ? "bg-destructive/20"
                      : reason.severity === "medium"
                      ? "bg-warning/20"
                      : "bg-success/20"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      reason.severity === "high"
                        ? "bg-destructive"
                        : reason.severity === "medium"
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold">{reason.type}</p>
                  <p className="text-[11px] text-muted-foreground">{reason.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded-lg border bg-success/5 border-success/20 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-success">All Checks Passed</p>
              <p className="text-[11px] text-muted-foreground">Transaction is safe to proceed</p>
            </div>
          </div>
        )}
      </div>

      {/* Security Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center gap-2 border border-muted/20"
      >
        <div className={`w-2 h-2 rounded-full ${isHighRisk ? "bg-destructive animate-pulse" : "bg-success"}`} />
        <span className="text-xs text-muted-foreground">
          {isHighRisk
            ? "⚠️ Manual review recommended"
            : score >= 30
            ? "⚡ Review before proceeding"
            : "✓ Secure transaction"}
        </span>
      </motion.div>
    </motion.div>
  );
};

export default AIFraudHeatmap;
