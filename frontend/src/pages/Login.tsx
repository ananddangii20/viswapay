import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Mail, Lock, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  const handleDemo = () => {
    navigate("/dashboard");
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
            Global Payments Powered by AI and Blockchain
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                className="pl-10 bg-muted/50 border-border h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-blue">
              Log In <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </form>

        {/* Demo & Signup */}
        <div className="mt-4 space-y-3">
          <Button
            variant="outline"
            onClick={handleDemo}
            className="w-full h-12 border-secondary/40 text-secondary hover:bg-secondary/10"
          >
            <Zap className="mr-2 w-4 h-4" /> Try Demo
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <span className="text-primary cursor-pointer hover:underline">Sign up</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
