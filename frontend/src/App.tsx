import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
        <AuthProvider>
          <div className="max-w-md mx-auto min-h-screen relative">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/send" element={<ProtectedRoute><SendPayment /></ProtectedRoute>} />
              <Route path="/fraud" element={<ProtectedRoute><FraudAnalysis /></ProtectedRoute>} />
              <Route path="/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/qr" element={<ProtectedRoute><QRPayment /></ProtectedRoute>} />
              <Route path="/offline" element={<ProtectedRoute><OfflineToken /></ProtectedRoute>} />
              <Route path="/ledger" element={<ProtectedRoute><BlockchainLedger /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
