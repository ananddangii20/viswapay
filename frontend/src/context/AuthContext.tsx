import { createContext, useContext, useState, ReactNode } from "react";
import api from "@/lib/axios";

interface User {
  id?: string;
  name: string;
  email: string;
  balance: number;   // ⭐ add this
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  setAuthSession: (jwt: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {

  // SAFE TOKEN INIT
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem("token");
    return t && t !== "undefined" ? t : null;
  });

  // SUPER SAFE USER INIT
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored || stored === "undefined") return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!token;

  const setAuthSession = (jwt: string, userData: User) => {
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    const { token: jwt, user: userData } = response.data;
    setAuthSession(jwt, userData);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await api.post("/auth/register", { name, email, password });
    const { token: jwt, user: userData } = response.data;
    setAuthSession(jwt, userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        login,
        register,
        setAuthSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};