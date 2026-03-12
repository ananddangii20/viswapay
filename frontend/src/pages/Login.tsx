import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Mail, Lock, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { auth, googleProvider } from "@/lib/firebase";
import axios from "axios";
import { signInWithPopup } from "firebase/auth";

const Login = () => {
  const navigate = useNavigate();
  const { login, setAuthSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Login failed");
      } else {
        toast.error("Server error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      const response = await api.post("/auth/google", {
        name: googleUser.displayName || "Google User",
        email: googleUser.email
      });

      const jwt = response.data.token;

      setAuthSession(jwt, {
        id: googleUser.uid,
        name: googleUser.displayName || "Google User",
        email: googleUser.email || ""
      });

      navigate("/dashboard");

    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Google login failed");
      } else {
        toast.error("Google popup closed or blocked");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDemo = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 glow-blue">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">ViswaPay</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Global Payments Powered by AI + Blockchain
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            <Button disabled={isLoading} className="w-full h-12 gradient-primary">
              {isLoading ? "Logging in..." : "Log In"} 
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            {/* GOOGLE BUTTON */}
            <Button
              type="button"
              variant="outline"
              disabled={isGoogleLoading}
              onClick={handleGoogleSignIn}
              className="w-full h-12 border-border bg-background/60"
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-2 3.1l3.2 2.5c1.9-1.8 3-4.4 3-7.5 0-.7-.1-1.4-.2-2H12z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.9 8.1 22 12 22z" />
                <path fill="#4A90E2" d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.5H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6z" />
                <path fill="#FBBC05" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.1 3.1 7.5l3.3 2.6c.8-2.3 3-4.2 5.6-4.2z" />
              </svg>
              {isGoogleLoading ? "Signing in..." : "Continue with Google"}
            </Button>

          </div>
        </form>

        <div className="mt-4 space-y-3">
          <Button variant="outline" onClick={handleDemo} className="w-full h-12">
            <Zap className="mr-2 w-4 h-4" /> Try Demo
          </Button>

          <p className="text-center text-sm">
            Don’t have account?{" "}
            <span
              className="text-primary cursor-pointer"
              onClick={() => navigate("/register")}
            >
              Sign up
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;