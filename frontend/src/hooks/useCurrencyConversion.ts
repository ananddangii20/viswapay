import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";

interface UseCurrencyConversionParams {
  amount: string;
  toCurrency: string;
  token?: string | null;
}

export interface CurrencyConversionState {
  convertedAmount: number;
  rate: number;
  loading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 450;

export const useCurrencyConversion = ({
  amount,
  toCurrency,
  token,
}: UseCurrencyConversionParams): CurrencyConversionState => {
  const [state, setState] = useState<CurrencyConversionState>({
    convertedAmount: 0,
    rate: 0,
    loading: false,
    error: null,
  });

  const numericAmount = useMemo(() => Number(amount), [amount]);

  useEffect(() => {
    if (!numericAmount || numericAmount <= 0 || !toCurrency) {
      setState({
        convertedAmount: 0,
        rate: 0,
        loading: false,
        error: null,
      });
      return;
    }

    const timer = window.setTimeout(async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined;

        const response = await api.get("/payment/convert", {
          params: {
            amount: numericAmount,
            to: toCurrency,
          },
          headers,
        });

        const data = response.data ?? {};
        const convertedAmount =
          Number(data.convertedAmount ?? data.converted ?? data.amount ?? 0) || 0;
        const rate = Number(data.rate ?? data.exchangeRate ?? 0) || 0;

        setState({
          convertedAmount,
          rate,
          loading: false,
          error: null,
        });
      } catch {
        setState({
          convertedAmount: numericAmount * 0.012,
          rate: 0.012,
          loading: false,
          error: "Unable to fetch live conversion",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [numericAmount, toCurrency, token]);

  return state;
};
