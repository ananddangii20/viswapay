import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Link2, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { toast } from "sonner";

interface TransactionHistoryItem {
  _id?: string;
  sender?: string;
  receiver?: string;
  receiverEmail?: string;
  amount?: number;
  currency?: string;
  status?: string;
  blockchainHash?: string;
  type?: "in" | "out";
  direction?: "Sent" | "Received";
  createdAt?: string;
}

const shortHash = (hash?: string) => {
  if (!hash) return "--";
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

const BlockchainLedger = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [ledgerData, setLedgerData] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);

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

        setLedgerData(history);
      } catch {
        setLedgerData([]);
        toast.error("Failed to fetch transaction history");
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, [token]);

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold font-display">Blockchain Ledger</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        {/* Verified badge */}
        <div className="glass-card p-3 flex items-center gap-2 glow-teal">
          <Shield className="w-4 h-4 text-secondary" />
          <span className="text-xs font-medium text-secondary">Verified on ViswaPay Blockchain Network</span>
        </div>

        {/* Ledger entries */}
        <div className="space-y-3">
          {loading ? (
            <div className="glass-card p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading history...
            </div>
          ) : null}

          {!loading && ledgerData.length === 0 ? (
            <div className="glass-card p-4 text-sm text-muted-foreground">No transaction history available.</div>
          ) : null}

          {ledgerData.map((tx, i) => (
            <motion.div
              key={tx._id ?? `${tx.receiverEmail}-${tx.createdAt}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-primary">{tx._id ?? "--"}</span>
                <span className={`text-sm font-bold ${
                  tx.type === "in" 
                    ? "text-success" 
                    : "text-destructive"
                }`}>
                  {tx.type === "in" ? "+" : "-"}{(tx.currency ?? "USD").toUpperCase()} {Number(tx.amount ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Receiver: {tx.receiverEmail ?? "--"}</span>
                <span>Status: {tx.status ?? "PENDING"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Date: {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "--"}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Link2 className="w-3 h-3 text-secondary" />
                <span className="font-mono text-muted-foreground">{shortHash(tx.blockchainHash)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default BlockchainLedger;
