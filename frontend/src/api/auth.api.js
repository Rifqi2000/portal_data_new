import http from "./http";

export const authApi = {
  login: (payload) => http.post("/auth/login", payload),
  me: () => http.get("/auth/me"),
  refresh: (payload) => http.post("/auth/refresh", payload),
  logout: (payload) => http.post("/auth/logout", payload),
};
