// src/utils/storage.js

const ACCESS_KEY = "pd_access_token";
const REFRESH_KEY = "pd_refresh_token";

/**
 * Cek apakah localStorage tersedia (SSR-safe & browser-safe)
 */
function isStorageAvailable() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

/**
 * Simpan token ke localStorage
 */
export function setTokens(accessToken, refreshToken) {
  if (!isStorageAvailable()) return;

  if (accessToken && accessToken !== "undefined" && accessToken !== "null") {
    localStorage.setItem(ACCESS_KEY, String(accessToken));
  }

  if (refreshToken && refreshToken !== "undefined" && refreshToken !== "null") {
    localStorage.setItem(REFRESH_KEY, String(refreshToken));
  }
}

/**
 * Ambil access token
 */
export function getAccessToken() {
  if (!isStorageAvailable()) return null;

  const token = localStorage.getItem(ACCESS_KEY);
  return token && token !== "undefined" && token !== "null"
    ? token
    : null;
}

/**
 * Ambil refresh token
 */
export function getRefreshToken() {
  if (!isStorageAvailable()) return null;

  const token = localStorage.getItem(REFRESH_KEY);
  return token && token !== "undefined" && token !== "null"
    ? token
    : null;
}

/**
 * Hapus semua token
 */
export function clearTokens() {
  if (!isStorageAvailable()) return;

  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * Helper: cek apakah user dianggap login
 */
export function isAuthenticated() {
  return !!getAccessToken();
}
