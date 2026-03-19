import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Globe, TrendingUp } from "lucide-react";

// Country coordinates (longitude, latitude) for map visualization
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "India": [78.96, 20.59],
  "USA": [-95.71, 37.09],
  "UK": [-3.43, 55.37],
  "UAE": [53.84, 23.42],
  "Canada": [-95.71, 56.13],
  "Germany": [10.45, 51.15],
  "France": [2.21, 46.23],
  "Japan": [138.25, 36.20],
  "Singapore": [103.81, 1.35],
  "Hong Kong": [114.17, 22.40],
  "Australia": [133.77, -25.27],
  "Brazil": [-51.92, -14.23],
  "Mexico": [-102.55, 23.63],
  "South Korea": [127.27, 37.27],
  "Thailand": [100.99, 15.87],
  "Malaysia": [101.69, 4.21],
  "Indonesia": [113.92, -2.17],
  "Philippines": [121.77, 12.87],
  "New Zealand": [174.88, -40.90],
};

interface Transaction {
  _id?: string;
  id?: string | number;
  senderCountry?: string;
  receiverCountry?: string;
  amount?: number;
  currency?: string;
  bankName?: string;
  status?: string;
  createdAt?: string;
}

interface AnimatedTransfer {
  id: string;
  from: [number, number];
  to: [number, number];
  fromCountry: string;
  toCountry: string;
  amount: number;
  currency: string;
  bankName: string;
  progress: number;
}

const GlobalTransferMap = ({ transactions = [] }: { transactions: Transaction[] }) => {
  const [animatedTransfers, setAnimatedTransfers] = useState<AnimatedTransfer[]>([]);
  const [hoveredTransfer, setHoveredTransfer] = useState<string | null>(null);

  // Normalize coordinates to SVG viewport (1000x600)
  const normalizeCoord = (coord: [number, number]): [number, number] => {
    const [lon, lat] = coord;
    const x = ((lon + 180) / 360) * 1000;
    const y = ((90 - lat) / 180) * 600;
    return [x, y];
  };

  // Generate Bezier path between two points
  const generatePath = (from: [number, number], to: [number, number]) => {
    const [x1, y1] = from;
    const [x2, y2] = to;
    const mx = (x1 + x2) / 2;
    const my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.2; // Arc height

    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  };

  // Create animated transfers from recent transactions
  useMemo(() => {
    const newTransfers: AnimatedTransfer[] = (transactions || [])
      .slice(0, 5)
      .filter(
        (tx) =>
          tx.senderCountry &&
          tx.receiverCountry &&
          COUNTRY_COORDS[tx.senderCountry] &&
          COUNTRY_COORDS[tx.receiverCountry]
      )
      .map((tx, idx) => ({
        id: `${tx._id || tx.id || idx}`,
        from: normalizeCoord(COUNTRY_COORDS[tx.senderCountry!]),
        to: normalizeCoord(COUNTRY_COORDS[tx.receiverCountry!]),
        fromCountry: tx.senderCountry || "Unknown",
        toCountry: tx.receiverCountry || "Unknown",
        amount: tx.amount || 0,
        currency: tx.currency || "USD",
        bankName: tx.bankName || "Direct Transfer",
        progress: 0,
      }));

    setAnimatedTransfers(newTransfers);
  }, [transactions]);

  // Animate each transfer line
  useEffect(() => {
    if (animatedTransfers.length === 0) return;

    const interval = setInterval(() => {
      setAnimatedTransfers((prev) =>
        prev.map((transfer) => ({
          ...transfer,
          progress: (transfer.progress + 0.02) % 1,
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, [animatedTransfers.length]);

  if (animatedTransfers.length === 0) {
    return (
      <motion.div
        variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-secondary" />
          <span className="text-sm font-semibold">Global Transfers</span>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p className="text-xs">No recent global transfers to display</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
      initial="hidden"
      animate="show"
      transition={{ duration: 0.4 }}
      className="glass-card p-6 glow-purple"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold">Recent Global Transfers</span>
        <TrendingUp className="w-3 h-3 text-secondary/60 ml-auto animate-pulse-glow" />
      </div>

      {/* Map Container */}
      <div className="relative bg-muted/30 rounded-lg overflow-hidden border border-secondary/20 mb-4">
        <svg viewBox="0 0 1000 600" className="w-full h-auto" style={{ minHeight: "300px" }}>
          {/* World map background grid */}
          <defs>
            <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--secondary)/0.05)" />
              <stop offset="100%" stopColor="hsl(var(--primary)/0.05)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="1000" height="600" fill="url(#mapGrad)" />

          {/* Grid lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`vline-${i}`}
              x1={(i + 1) * 100}
              y1="0"
              x2={(i + 1) * 100}
              y2="600"
              stroke="hsl(var(--muted-foreground)/0.1)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`hline-${i}`}
              x1="0"
              y1={(i + 1) * 100}
              x2="1000"
              y2={(i + 1) * 100}
              stroke="hsl(var(--muted-foreground)/0.1)"
              strokeWidth="1"
            />
          ))}

          {/* Animated transfer lines and currency symbols */}
          {animatedTransfers.map((transfer) => {
            const path = generatePath(transfer.from, transfer.to);
            const length = 300; // Approximate path length

            // Calculate position for currency symbol
            const t = transfer.progress;
            const [x1, y1] = transfer.from;
            const [x2, y2] = transfer.to;
            const mx = (x1 + x2) / 2;
            const my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.2;

            // Quadratic Bezier position at t
            const curX = Math.pow(1 - t, 2) * x1 + 2 * (1 - t) * t * mx + Math.pow(t, 2) * x2;
            const curY = Math.pow(1 - t, 2) * y1 + 2 * (1 - t) * t * my + Math.pow(t, 2) * y2;

            const currencySymbols: Record<string, string> = {
              USD: "$",
              EUR: "€",
              GBP: "£",
              AED: "د.إ",
              INR: "₹",
            };

            const symbol = currencySymbols[transfer.currency] || "$";

            return (
              <g key={transfer.id}>
                {/* Transfer line background */}
                <path
                  d={path}
                  fill="none"
                  stroke="hsl(var(--secondary)/0.2)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Animated gradient transfer line */}
                <motion.path
                  d={path}
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: transfer.progress, opacity: 1 }}
                  transition={{ duration: 0.05, ease: "linear" }}
                  filter="url(#glow)"
                  onMouseEnter={() => setHoveredTransfer(transfer.id)}
                  onMouseLeave={() => setHoveredTransfer(null)}
                  className="cursor-pointer transition-all"
                  style={{
                    stroke:
                      hoveredTransfer === transfer.id
                        ? "hsl(var(--primary))"
                        : "hsl(var(--secondary))",
                  }}
                />

                {/* Floating currency symbol */}
                <motion.g
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.5] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: Math.random() * 1,
                  }}
                >
                  <circle
                    cx={curX}
                    cy={curY}
                    r="12"
                    fill="hsl(var(--secondary)/0.2)"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="1"
                  />
                  <text
                    x={curX}
                    y={curY + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="hsl(var(--secondary))"
                  >
                    {symbol}
                  </text>
                </motion.g>

                {/* Origin country dot */}
                <circle
                  cx={transfer.from[0]}
                  cy={transfer.from[1]}
                  r="6"
                  fill="hsl(var(--success))"
                  stroke="hsl(var(--success))"
                  strokeWidth="2"
                  filter="url(#glow)"
                />

                {/* Destination country dot */}
                <circle
                  cx={transfer.to[0]}
                  cy={transfer.to[1]}
                  r="6"
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Transfer details list */}
      <div className="space-y-2 max-h-[180px] overflow-y-auto">
        {animatedTransfers.map((transfer, idx) => (
          <motion.div
            key={transfer.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onMouseEnter={() => setHoveredTransfer(transfer.id)}
            onMouseLeave={() => setHoveredTransfer(null)}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              hoveredTransfer === transfer.id
                ? "bg-secondary/15 border-secondary/40"
                : "bg-muted/20 border-muted/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold">
                {transfer.fromCountry} → {transfer.toCountry}
              </p>
              <span className="text-xs font-bold text-secondary">
                {transfer.currency} {transfer.amount.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              via {transfer.bankName}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default GlobalTransferMap;
