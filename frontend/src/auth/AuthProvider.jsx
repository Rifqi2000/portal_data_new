// src/auth/AuthProvider.jsx
import React, { createContext, useEffect, useMemo, useState, useCallback } from "react";
import { authApi } from "../api/auth.api";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../utils/storage";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const access = getAccessToken();

    // kalau tidak ada token: tidak perlu call /me
    if (!access) {
      setUser(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const res = await authApi.me();
      // backend: ok(res, req.user, "OK") => user ada di res.data.data
      const u = res.data?.data ?? null;
      setUser(u);
      return u;
    } catch (e) {
      // token invalid/expired dan refresh gagal -> clear
      clearTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  async function login(username, password) {
    const res = await authApi.login({ username, password });

    const access = res.data?.data?.access_token;
    const refresh = res.data?.data?.refresh_token;
    const u = res.data?.data?.user ?? null;

    if (!access || !refresh) {
      const err = new Error("Token tidak ditemukan dari response login.");
      err.response = res;
      throw err;
    }

    setTokens(access, refresh);

    // kalau user dikirim saat login, langsung set
    if (u) {
      setUser(u);
      setLoading(false);
      return u;
    }

    // fallback: ambil dari /me
    return await refreshMe();
  }

  async function logout(all_devices = false) {
    const rt = getRefreshToken() || null;

    try {
      if (rt) {
        await authApi.logout({ refresh_token: rt, all_devices });
      }
    } catch {
      // ignore error server
    } finally {
      clearTokens();
      setUser(null);
      setLoading(false);
    }
  }

  const isAuthenticated = !!getAccessToken();

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshMe,
      isAuthenticated,
    }),
    [user, loading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}