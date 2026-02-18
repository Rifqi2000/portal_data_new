// src/utils/storage.js
const ACCESS_KEY = "pd_access_token";
const REFRESH_KEY = "pd_refresh_token";

export function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, String(accessToken));
  if (refreshToken) localStorage.setItem(REFRESH_KEY, String(refreshToken));
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
