import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Link2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const ledgerData = [
  { id: "VSP-TX-928471", sender: "Arjun P.", receiver: "Alice J.", amount: "$12.00", hash: "0x7a3f...b82e" },
  { id: "VSP-TX-817362", sender: "Bob K.", receiver: "Arjun P.", amount: "£120.00", hash: "0x9c2d...f41a" },
  { id: "VSP-TX-706253", sender: "Arjun P.", receiver: "Chen W.", amount: "¥800.00", hash: "0x1e8b...d73c" },
  { id: "VSP-TX-695144", sender: "Maria S.", receiver: "Arjun P.", amount: "R$200.00", hash: "0x4f6a...e92b" },
  { id: "VSP-TX-584035", sender: "Arjun P.", receiver: "Yuki T.", amount: "¥1,500", hash: "0x2b7c...a15d" },
];

const BlockchainLedger = () => {
  const navigate = useNavigate();

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
          {ledgerData.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-primary">{tx.id}</span>
                <span className="text-sm font-bold">{tx.amount}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{tx.sender} → {tx.receiver}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Link2 className="w-3 h-3 text-secondary" />
                <span className="font-mono text-muted-foreground">{tx.hash}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default BlockchainLedger;
