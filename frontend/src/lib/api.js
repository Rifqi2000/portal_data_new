// src/lib/api.js
import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../utils/storage";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// 1) inject access token ke setiap request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

// helper untuk antrian request saat refresh sedang berjalan
function resolveQueue(error, token = null) {
  queue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  queue = [];
}

// 2) auto refresh saat 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    // kalau bukan 401 -> lempar
    if (status !== 401) throw error;

    // mencegah retry berkali-kali
    if (originalRequest._retry) throw error;
    originalRequest._retry = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      window.location.href = "/login";
      throw error;
    }

    // kalau refresh sedang berjalan, request lain ngantri
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((newAccess) => {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      // penting: pakai axios biasa agar tidak kena interceptor api lagi
      const refreshRes = await axios.post(`${baseURL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const newAccess = refreshRes.data?.data?.access_token;
      const newRefresh = refreshRes.data?.data?.refresh_token || refreshToken;

      if (!newAccess) throw new Error("Refresh success tapi access_token kosong");

      setTokens(newAccess, newRefresh);
      resolveQueue(null, newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (err) {
      resolveQueue(err, null);
      clearTokens();
      window.location.href = "/login";
      throw err;
    } finally {
      isRefreshing = false;
    }
  }
);
