import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Send, QrCode, Wifi, Shield, ArrowUpRight, ArrowDownLeft,
  TrendingUp, Link2, LogOut, Gauge, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { toast } from "sonner";
import GlobalTransferMap from "@/components/GlobalTransferMap";

interface TransactionHistoryItem {
  _id?: string;
  id?: string | number;
  sender?: string;
  receiver?: string;
  senderCountry?: string;
  receiverCountry?: string;
  receiverEmail?: string;
  amount?: number;
  currency?: string;
  bankName?: string;
  status?: string;
  blockchainHash?: string;
  type?: "in" | "out";  // Direction badge from backend
  direction?: "Sent" | "Received";  // Display label
  displayName?: string;  // Pre-formatted display name
  createdAt?: string;
}

const shortHash = (hash?: string) => {
  if (!hash) return "";
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingTransactions(true);

      try {
        const response = await api.get("/payment/history", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        const history = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as { transactions?: unknown[] })?.transactions)
            ? (response.data as { transactions: TransactionHistoryItem[] }).transactions
            : [];

        setTransactions(history.slice(0, 5));
      } catch {
        setTransactions([]);
        toast.error("Failed to load recent transactions");
      } finally {
        setLoadingTransactions(false);
      }
    };

    void fetchHistory();
  }, [token]);

  const recentTransactions = useMemo(
    () =>
      transactions.map((tx) => {
        // Use direction from backend, fallback to determining based on type field
        const isOutgoing = tx.type === "out" || tx.direction === "Sent";
        const amount = Number(tx.amount ?? 0);
        
        return {
          ...tx,
          type: isOutgoing ? "out" : "in",
          amountText: `${(tx.currency ?? "USD").toUpperCase()} ${amount.toFixed(2)}`,
          // Show receiver for outgoing, show sender for incoming
          displayName: isOutgoing 
            ? (tx.displayName ?? tx.receiverEmail ?? "Unknown receiver")
            : (tx.displayName ?? tx.sender ?? "Unknown sender"),
          statusText: (tx.status ?? "PENDING").toString(),
        };
      }),
    [transactions],
  );

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Welcome back</p>
          <h1 className="text-xl font-bold font-display">{user?.name ?? "User"}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-4 space-y-4"
      >
        {/* Wallet Overview */}
        <motion.div variants={fadeUp} className="glass-card p-5 glow-blue relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary">🇮🇳 India</span>
          </div>
          <p className="text-muted-foreground text-sm">Wallet Balance</p>
          <h2 className="text-3xl font-bold font-display mt-1">₹{(user?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <p className="text-muted-foreground text-xs mt-1">≈ ${((user?.balance ?? 0) / 83).toFixed(2)} USD</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
          {[
            { icon: Send, label: "Send", color: "primary", to: "/send" },
            { icon: QrCode, label: "QR Pay", color: "secondary", to: "/qr" },
            { icon: Wifi, label: "Offline", color: "success", to: "/offline" },
          ].map(({ icon: Icon, label, color, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="glass-card p-4 flex flex-col items-center gap-2 hover:border-primary/40 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}/15`}>
                <Icon className={`w-5 h-5 text-${color}`} />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </motion.div>

        {/* Fraud Monitoring */}
        <motion.div variants={fadeUp} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold">Fraud Monitor</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/fraud")}>
              Details
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "18%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full rounded-full bg-success"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-success" />
              <span className="text-xs font-semibold text-success">Low Risk</span>
            </div>
          </div>
        </motion.div>

        {/* Global Transfer Map Visualization */}
        <GlobalTransferMap transactions={transactions} />

        {/* Recent Transactions */}
        <motion.div variants={fadeUp} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Recent Transactions</span>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/ledger")}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {loadingTransactions ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading transactions...
              </div>
            ) : null}

            {!loadingTransactions && recentTransactions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No transactions yet.</p>
            ) : null}

            {recentTransactions.map((tx, index) => (
              <div key={tx._id ?? tx.id ?? tx.createdAt ?? `tx-${index}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    tx.type === "in" ? "bg-success/15" : "bg-primary/15"
                  }`}>
                    {tx.type === "in" ? (
                      <ArrowDownLeft className="w-4 h-4 text-success" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{tx.displayName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        tx.type === "in" 
                          ? "bg-success/20 text-success"
                          : "bg-primary/20 text-primary"
                      }`}>
                        {tx.type === "in" ? "Received" : "Sent"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tx.statusText}</p>
                    {tx.blockchainHash ? (
                      <p className="text-[11px] text-secondary flex items-center gap-1 mt-0.5">
                        <Link2 className="w-3 h-3" />
                        Recorded on Blockchain: {shortHash(tx.blockchainHash)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  tx.type === "in" 
                    ? "text-success" 
                    : "text-destructive"
                }`}>
                  {tx.type === "in" ? "+" : "-"}{tx.amountText}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Blockchain Status */}
        <motion.div variants={fadeUp} className="glass-card p-4 flex items-center gap-3 glow-teal">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Blockchain Secured</p>
            <p className="text-xs text-muted-foreground">All transactions verified on-chain</p>
          </div>
          <TrendingUp className="w-4 h-4 text-secondary animate-pulse-glow" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
