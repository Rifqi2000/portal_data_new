import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  // kalau masih loading token/me
  if (loading) return null; // atau loading screen

  // belum login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return children;
}
