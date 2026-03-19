import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BankRate {
  bankName: string;
  exchangeRate: number;
  convertedAmount: number;
  processingFee: number;
}

interface BankComparisonModalProps {
  open: boolean;
  loading: boolean;
  rates: BankRate[];
  selectedBank: string;
  onSelectBank: (bankName: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const getEffectiveTotal = (rate: BankRate) => rate.convertedAmount - rate.processingFee;

const BankComparisonModal = ({
  open,
  loading,
  rates,
  selectedBank,
  onSelectBank,
  onClose,
  onConfirm,
}: BankComparisonModalProps) => {
  const cheapestBank = rates.length
    ? [...rates].sort((a, b) => getEffectiveTotal(b) - getEffectiveTotal(a))[0]
    : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bank Rate Comparison</DialogTitle>
          <DialogDescription>
            Select a bank to continue your transfer with the best available conversion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="glass-card p-4 text-sm text-muted-foreground">Loading bank rates...</div>
          ) : null}

          {!loading && rates.length === 0 ? (
            <div className="glass-card p-4 text-sm text-muted-foreground">No bank rates available right now.</div>
          ) : null}

          {!loading
            ? rates.map((rate) => {
                const isSelected = selectedBank === rate.bankName;
                const isCheapest = cheapestBank?.bankName === rate.bankName;

                return (
                  <button
                    key={rate.bankName}
                    onClick={() => onSelectBank(rate.bankName)}
                    className={`w-full text-left glass-card p-3 border transition-colors ${
                      isSelected ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{rate.bankName}</p>
                      {isCheapest ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success">
                          Cheapest
                        </span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                      <p>Rate: {rate.exchangeRate.toFixed(4)}</p>
                      <p>Converted: {rate.convertedAmount.toFixed(2)}</p>
                      <p>Fee: {rate.processingFee.toFixed(2)}</p>
                      <p>Net: {getEffectiveTotal(rate).toFixed(2)}</p>
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-1 mt-2 text-primary text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected
                      </div>
                    ) : null}
                  </button>
                );
              })
            : null}
        </div>

        <Button
          onClick={onConfirm}
          disabled={!selectedBank || loading}
          className="w-full h-11 gradient-primary text-primary-foreground"
        >
          Continue Payment
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BankComparisonModal;
