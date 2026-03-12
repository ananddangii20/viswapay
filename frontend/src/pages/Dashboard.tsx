import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Send, QrCode, Wifi, Shield, ArrowUpRight, ArrowDownLeft,
  TrendingUp, Link2, LogOut, Gauge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const transactions = [
  { id: 1, sender: "You", receiver: "Alice (US)", amount: "$50.00", status: "Completed", type: "out" },
  { id: 2, sender: "Bob (UK)", receiver: "You", amount: "£120.00", status: "Completed", type: "in" },
  { id: 3, sender: "You", receiver: "Chen (CN)", amount: "¥800.00", status: "Pending", type: "out" },
  { id: 4, sender: "Maria (BR)", receiver: "You", amount: "R$200.00", status: "Completed", type: "in" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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
          <h2 className="text-3xl font-bold font-display mt-1">₹84,250.00</h2>
          <p className="text-muted-foreground text-xs mt-1">≈ $1,010.00 USD</p>
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

        {/* Recent Transactions */}
        <motion.div variants={fadeUp} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Recent Transactions</span>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/ledger")}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
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
                    <p className="text-sm font-medium">{tx.type === "in" ? tx.sender : tx.receiver}</p>
                    <p className="text-xs text-muted-foreground">{tx.status}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === "in" ? "text-success" : ""}`}>
                  {tx.type === "in" ? "+" : "-"}{tx.amount}
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
