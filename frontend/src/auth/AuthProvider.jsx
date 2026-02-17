import { createContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth.api";
import { clearTokens, setTokens } from "../utils/storage";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try {
      const res = await authApi.me();
      setUser(res.data?.data?.user ?? res.data?.data ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  async function login(username, password) {
    const res = await authApi.login({ username, password });
    const access = res.data?.data?.access_token;
    const refresh = res.data?.data?.refresh_token;
    const u = res.data?.data?.user;

    setTokens(access, refresh);
    setUser(u);
    return u;
  }

  async function logout(refresh_token, all_devices = false) {
    try {
      await authApi.logout({ refresh_token, all_devices });
    } catch {
      // ignore
    } finally {
      clearTokens();
      setUser(null);
    }
  }

  const value = useMemo(() => ({ user, loading, login, logout, refreshMe }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
