import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Copy, Lock, Hash, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OfflinePaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionData?: {
    transactionId: string;
    blockchainHash: string;
    amount: number;
    currency: string;
    receiver: string;
    timestamp?: string;
  };
}

export const OfflinePaymentSuccessModal = ({
  isOpen,
  onClose,
  transactionData
}: OfflinePaymentSuccessModalProps) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (!transactionData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="bg-gradient-to-br from-card to-card/80 rounded-3xl max-w-md w-full overflow-hidden border border-primary/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Animation Header */}
            <div className="relative h-32 bg-gradient-to-b from-success/10 to-transparent flex items-center justify-center overflow-hidden">
              {/* Animated background circles */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute w-24 h-24 rounded-full bg-success/20 blur-2xl"
              />

              {/* Main checkmark */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2
                }}
                className="relative z-10"
              >
                <CheckCircle className="w-16 h-16 text-success drop-shadow-lg" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold font-display text-success mb-2">
                  ✨ Token Matched Successfully!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your offline payment has been processed and secured on the blockchain
                </p>
              </motion.div>

              {/* Amount Display */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-success/10 to-success/5 rounded-2xl p-4 text-center border border-success/20"
              >
                <div className="text-xs text-muted-foreground mb-2">Amount Sent</div>
                <div className="text-3xl font-bold font-display text-foreground">
                  {transactionData.amount}
                  <span className="text-lg ml-2 text-muted-foreground">
                    {transactionData.currency}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  To: {transactionData.receiver}
                </div>
              </motion.div>

              {/* Blockchain Hash */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Blockchain Secured
                  </span>
                </div>

                <div className="bg-muted/50 rounded-xl p-3 border border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">
                        Transaction Hash
                      </div>
                      <div className="font-mono text-xs break-all text-foreground/80">
                        {transactionData.blockchainHash.substring(0, 32)}
                        <br />
                        {transactionData.blockchainHash.substring(32)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          transactionData.blockchainHash,
                          "Hash"
                        )
                      }
                      className="flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Transaction ID */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Transaction ID
                  </span>
                </div>

                <div className="bg-muted/50 rounded-xl p-3 border border-border/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-xs text-foreground/80">
                      {transactionData.transactionId}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          transactionData.transactionId,
                          "Transaction ID"
                        )
                      }
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Security Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex gap-2 text-xs"
              >
                <div className="flex-1 bg-success/10 rounded-lg p-2 text-center border border-success/20">
                  <Zap className="w-3 h-3 text-success inline mr-1" />
                  <span className="text-success font-semibold">Encrypted</span>
                </div>
                <div className="flex-1 bg-primary/10 rounded-lg p-2 text-center border border-primary/20">
                  <Lock className="w-3 h-3 text-primary inline mr-1" />
                  <span className="text-primary font-semibold">Verified</span>
                </div>
              </motion.div>

              {/* Action Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  onClick={onClose}
                  className="w-full h-11 gradient-primary text-primary-foreground font-semibold glow-green"
                >
                  Done
                </Button>
              </motion.div>

              {/* Footer Note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30"
              >
                Your transaction is immutably recorded on the blockchain
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflinePaymentSuccessModal;
