import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface SessionData {
  name: string;
  mobile: string;
  sessionId: string;
}

interface AuthContextType {
  session: SessionData | null;
  setSession: (s: SessionData | null) => void;
  logout: () => void;
  isAdmin: boolean;
}

const SESSION_KEY = "typing_exam_session";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<SessionData | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? (JSON.parse(stored) as SessionData) : null;
    } catch {
      return null;
    }
  });

  const setSession = useCallback((s: SessionData | null) => {
    setSessionState(s);
    if (s) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, [setSession]);

  const isAdmin = session?.mobile === "8055926965";

  return (
    <AuthContext.Provider value={{ session, setSession, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
