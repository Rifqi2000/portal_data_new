// src/lib/api.js
import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "../utils/storage";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// axios instance untuk API utama (pakai interceptor)
export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// axios instance khusus auth/refresh (TANPA interceptor) supaya tidak loop
const plain = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Helper: ambil token dari berbagai bentuk response backend
function extractTokens(resData) {
  // dukung: { data: { access_token } } atau { access_token } atau variasi camelCase
  const payload = resData?.data ?? resData ?? {};

  const access =
    payload.access_token ?? payload.accessToken ?? payload.token ?? null;

  const refresh =
    payload.refresh_token ?? payload.refreshToken ?? payload.refresh ?? null;

  return { access, refresh };
}

// 1) inject access token ke setiap request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
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

// helper: jangan refresh untuk endpoint auth sendiri
function isAuthEndpoint(url = "") {
  // url bisa relative (/auth/login) atau full (http://.../auth/login)
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/logout")
  );
}

// 2) auto refresh saat 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    // kalau tidak ada config atau bukan 401 -> lempar
    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    // jangan coba refresh untuk endpoint auth itu sendiri (hindari loop)
    if (isAuthEndpoint(originalRequest.url)) {
      clearTokens();
      return Promise.reject(error);
    }

    // mencegah retry berkali-kali untuk request yang sama
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    const refreshToken = getRefreshToken();

    // kalau refresh token tidak ada -> paksa logout
    if (!refreshToken) {
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // kalau refresh sedang berjalan, request lain ngantri
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((newAccess) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      // refresh token (pakai plain axios biar tidak kena interceptor api)
      const refreshRes = await plain.post("/auth/refresh", {
        refresh_token: refreshToken,
      });

      const { access: newAccess, refresh: newRefreshRaw } = extractTokens(
        refreshRes.data
      );

      const newRefresh = newRefreshRaw || refreshToken;

      if (!newAccess) {
        throw new Error("Refresh response tidak mengandung access token");
      }

      // simpan token baru
      setTokens(newAccess, newRefresh);

      // lepaskan antrian request
      resolveQueue(null, newAccess);

      // ulang request awal dengan token baru
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (err) {
      resolveQueue(err, null);
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
