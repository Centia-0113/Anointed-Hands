import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User } from "../types";
import { authApi, tokenStore, AUTH_EXPIRED_EVENT } from "../services/api";

interface AuthContextValue {
  user: User | null;
  /** True until we've checked whether a saved session is still valid. */
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<User>;
  logout: () => void;
  /** Store a new session (e.g. after a password change returns a fresh token). */
  setSession: (token: string, user: User) => void;
  /** Re-fetch the current user (e.g. after verifying email). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a saved session on load
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  // The API rejected our token (expired / revoked) → sign out locally
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; phone?: string; password: string }) => {
      const res = await authApi.register(data);
      tokenStore.set(res.token);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const setSession = useCallback((token: string, u: User) => {
    tokenStore.set(token);
    setUser(u);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      setUser(await authApi.me());
    } catch {
      /* 401 handled by interceptor */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin: user?.role === "Admin", login, register, logout, setSession, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
