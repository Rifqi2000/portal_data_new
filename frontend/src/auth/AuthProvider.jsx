import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth.api";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../utils/storage";

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Ambil user dari /auth/me jika ada access token.
   * - Jika token invalid dan refresh gagal, interceptor akan clearTokens + redirect (atau minimal 401)
   * - Kita tetap amankan dengan clearTokens kalau /me gagal
   */
  async function refreshMe() {
    const access = getAccessToken();

    // Kalau tidak ada token, tidak perlu call /me
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
      // token invalid / expired dan refresh juga gagal
      clearTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * login
   * - simpan token
   * - set user dari response (kalau ada)
   * - kalau user tidak ada di response, fallback panggil /me
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

    // kalau backend sudah kirim user, pakai itu
    if (u) {
      setUser(u);
      setLoading(false);
      return u;
    }

    // fallback: ambil user dari /me (lebih konsisten)
    const me = await refreshMe();
    return me;
  }

  /**
   * logout (protected)
   * - gunakan refresh_token dari storage untuk revoke (current device)
   * - tetap clear local walau server error
   */
// src/auth/AuthProvider.jsx
  async function logout(all_devices = false) {
    const rt = getRefreshToken?.() || null;

    try {
      // endpoint logout protected => butuh Authorization Bearer access token (sudah di api interceptor)
      // kirim refresh_token supaya server revoke token device ini
      if (rt) {
        await authApi.logout({ refresh_token: rt, all_devices });
      }
    } catch (e) {
      // abaikan error server, yang penting local session bersih
    } finally {
      clearTokens();
      setUser(null);
      // pakai navigate di komponen yang memanggil (lebih bersih)
    }
  }


  // ✅ penting: isAuthenticated sebaiknya cek token, bukan user
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
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
