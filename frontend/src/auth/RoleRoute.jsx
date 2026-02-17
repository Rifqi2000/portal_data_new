import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RoleRoute({ allow = [], children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const role = String(user.role || "").toUpperCase();
  const ok = !allow.length || allow.map((x) => x.toUpperCase()).includes(role);
  if (!ok) return <Navigate to="/" replace />;

  return children;
}
