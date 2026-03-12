import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, QrCode, Camera, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const QRPayment = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("500");
  const [generated, setGenerated] = useState(false);

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold font-display">QR Payment</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        {/* Scan QR */}
        <div className="glass-card p-5 flex flex-col items-center">
          <Camera className="w-8 h-8 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">Scan QR Code</h3>
          <p className="text-xs text-muted-foreground text-center mb-4">
            Point your camera at a QR code to pay instantly
          </p>
          <div className="w-48 h-48 rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center bg-muted/30 relative overflow-hidden">
            <motion.div
              animate={{ y: [-80, 80] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
              className="absolute w-full h-0.5 bg-primary/50"
            />
            <QrCode className="w-12 h-12 text-muted-foreground/30" />
          </div>
          <Button className="mt-4 gradient-primary text-primary-foreground glow-blue">
            <Camera className="w-4 h-4 mr-2" /> Open Camera
          </Button>
        </div>

        {/* Generate QR */}
        <div className="glass-card p-5 flex flex-col items-center">
          <QrCode className="w-8 h-8 text-secondary mb-3" />
          <h3 className="text-sm font-semibold mb-1">Generate QR Code</h3>
          <p className="text-xs text-muted-foreground text-center mb-4">
            Create a QR code for others to pay you
          </p>

          <div className="w-full mb-4">
            <label className="text-xs text-muted-foreground mb-1.5 block">Payment Amount</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setGenerated(false); }}
              className="bg-muted/50 h-12"
              placeholder="Enter amount"
            />
          </div>

          {generated ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              {/* Simulated QR */}
              <div className="w-48 h-48 rounded-xl bg-foreground p-3 mb-3">
                <div className="w-full h-full grid grid-cols-7 grid-rows-7 gap-0.5">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${Math.random() > 0.4 ? "bg-background" : "bg-transparent"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">User: arjun@viswapay</p>
              <p className="text-xs text-muted-foreground mb-3">Amount: ₹{amount}</p>
              <Button variant="outline" size="sm" className="text-xs border-secondary/30 text-secondary">
                <Download className="w-3 h-3 mr-1" /> Save QR
              </Button>
            </motion.div>
          ) : (
            <Button
              onClick={() => setGenerated(true)}
              className="gradient-primary text-primary-foreground glow-teal"
            >
              Generate QR Code
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default QRPayment;
