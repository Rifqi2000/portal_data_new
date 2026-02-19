import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { getAccessToken } from "../utils/storage";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  const hasToken = !!getAccessToken();

  if (loading) return null;

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // token ada tapi user belum ada (misal /me gagal) => lempar ke login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return children;
}
