import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SendPayment from "./pages/SendPayment";
import FraudAnalysis from "./pages/FraudAnalysis";
import PaymentSuccess from "./pages/PaymentSuccess";
import QRPayment from "./pages/QRPayment";
import OfflineToken from "./pages/OfflineToken";
import BlockchainLedger from "./pages/BlockchainLedger";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="max-w-md mx-auto min-h-screen relative">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/send" element={<SendPayment />} />
            <Route path="/fraud" element={<FraudAnalysis />} />
            <Route path="/success" element={<PaymentSuccess />} />
            <Route path="/qr" element={<QRPayment />} />
            <Route path="/offline" element={<OfflineToken />} />
            <Route path="/ledger" element={<BlockchainLedger />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
