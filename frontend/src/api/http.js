import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../utils/storage";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

function flushQueue(err, token = null) {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const rt = getRefreshToken();
      if (!rt) {
        clearTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject })).then((newAT) => {
          original.headers.Authorization = `Bearer ${newAT}`;
          return http(original);
        });
      }

      isRefreshing = true;
      try {
        const r = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
          refresh_token: rt,
        });

        const newAT = r.data?.data?.access_token;
        const newRT = r.data?.data?.refresh_token;
        if (!newAT || !newRT) throw new Error("Refresh failed");

        setTokens(newAT, newRT);
        flushQueue(null, newAT);

        original.headers.Authorization = `Bearer ${newAT}`;
        return http(original);
      } catch (e) {
        flushQueue(e, null);
        clearTokens();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default http;
