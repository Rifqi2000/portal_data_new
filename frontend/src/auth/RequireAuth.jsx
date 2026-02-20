// src/auth/RequireAuth.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { getAccessToken } from "../utils/storage";

export default function RequireAuth({ children }) {
  const { loading } = useAuth() || {};
  const loc = useLocation();
  const token = getAccessToken();

  if (loading) return null;

  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return children;
}