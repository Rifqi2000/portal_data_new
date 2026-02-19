import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { getAccessToken } from "../utils/storage";

export default function ProtectedRoute({ children }) {
  const { loading } = useAuth();
  const loc = useLocation();
  const hasToken = !!getAccessToken();

  if (loading) return null;

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return children;
}
