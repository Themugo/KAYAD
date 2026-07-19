import { createContext, useContext, useState, useCallback, ReactNode } from "react";
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) return { user: null };
  return ctx;
}
interface AuthProviderProps { children: ReactNode }
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      setUser({ id: "1", name: "Demo User", email, role: "user" });
    } finally {
      setLoading(false);
    }
  }, []);
  const register = useCallback(async (data: any) => {
    setLoading(true);
    try {
      setUser({ id: "1", name: data.name || "User", email: data.email, role: "user" });
    } finally {
      setLoading(false);
    }
  }, []);
  const logout = useCallback(() => setUser(null), []);
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
