import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth.api";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../utils/storage";

export const AuthContext = createContext(null);

/**
 * Hook helper supaya komponen tidak import useContext manual.
 * Kalau provider belum kepasang, return null (biar bisa fallback).
 */
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * AuthProvider
 * - memanggil /auth/me saat app start (kalau ada token)
 * - login => simpan token + setUser
 * - logout => panggil endpoint logout (opsional) lalu clear tokens
 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const access = getAccessToken?.() || null;

    // Kalau tidak ada token, jangan call /me (biar ga spam 401)
    if (!access) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.me();
      // backend kamu kadang return { user } atau langsung object user
      const u = res.data?.data?.user ?? res.data?.data ?? null;
      setUser(u);
    } catch (e) {
      // kalau token invalid/expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * login(username, password)
   * NOTE: kamu sebelumnya pakai login(username,password)
   * jadi aku pertahankan signature itu agar LoginPage kamu tidak perlu ubah banyak.
   */
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
    setUser(u);

    return u;
  }

  /**
   * logout(refresh_token, all_devices=false)
   * - kalau refresh_token tidak dikirim, ambil dari storage
   */
  async function logout(refresh_token, all_devices = false) {
    const rt = refresh_token || (getRefreshToken?.() || null);

    try {
      // kalau backend kamu butuh refresh_token untuk revoke
      if (rt) {
        await authApi.logout({ refresh_token: rt, all_devices });
      }
    } catch {
      // ignore error logout server (tetap clear local)
    } finally {
      clearTokens();
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshMe,
      isAuthenticated: !!user,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
