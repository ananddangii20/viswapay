import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Mail, Lock, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { auth, googleProvider } from "@/lib/firebase";
import axios from "axios";
import { signInWithPopup } from "firebase/auth";

const Register = () => {
  const navigate = useNavigate();
  const { register, setAuthSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created successfully! Please log in.");
      navigate("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || "Registration failed. Please try again.";
        toast.error(message);
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      if (!googleUser.email) {
        throw new Error("Google account email is required.");
      }

      const response = await api.post("/auth/google", {
        name: googleUser.displayName || "Google User",
        email: googleUser.email,
      });

      const jwt = response.data?.token;
      if (!jwt) {
        throw new Error("Authentication token was not returned by server.");
      }

      setAuthSession(jwt, {
        id: response.data?.user?.id || googleUser.uid,
        name: response.data?.user?.name || googleUser.displayName || "Google User",
        email: response.data?.user?.email || googleUser.email,
      });

      navigate("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || "Google sign-up failed. Please try again.";
        toast.error(message);
      } else if (err instanceof Error && err.message.includes("popup")) {
        toast.error("Google sign-in popup was closed or blocked.");
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Google sign-up failed. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background globe animation */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="w-[600px] h-[600px] rounded-full border border-primary/40"
        >
          <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/30" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/30" />
          <div className="absolute inset-[15%] rounded-full border border-primary/20" />
          <div className="absolute inset-[30%] rounded-full border border-primary/20" />
        </motion.div>
      </div>

      {/* Floating dots */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/40"
          style={{ top: `${15 + i * 14}%`, left: `${10 + i * 15}%` }}
          animate={{ y: [-10, 10, -10], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 glow-blue"
          >
            <Globe className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold font-display gradient-text">ViswaPay</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Create your account to get started
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="pl-10 bg-muted/50 border-border h-12"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-muted/50 border-border h-12"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 bg-muted/50 border-border h-12"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-blue"
            >
              {isLoading ? "Creating account..." : "Create Account"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isGoogleLoading}
              onClick={handleGoogleSignUp}
              className="w-full h-12 border-border bg-background/60"
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-2 3.1l3.2 2.5c1.9-1.8 3-4.4 3-7.5 0-.7-.1-1.4-.2-2H12z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.9 8.1 22 12 22z" />
                <path fill="#4A90E2" d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.5H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6z" />
                <path fill="#FBBC05" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.1 3.1 7.5l3.3 2.6c.8-2.3 3-4.2 5.6-4.2z" />
              </svg>
              {isGoogleLoading ? "Signing up with Google..." : "Continue with Google"}
            </Button>
          </div>
        </form>

        {/* Login link */}
        <div className="mt-4">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <span
              className="text-primary cursor-pointer hover:underline"
              onClick={() => navigate("/")}
            >
              Log in
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
