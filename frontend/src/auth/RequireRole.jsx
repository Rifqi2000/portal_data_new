// src/auth/RequireRole.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

function normalizeRole(user) {
  // dukung beberapa kemungkinan field dari backend
  const role =
    user?.role ??
    user?.role_name ??
    user?.roles?.[0]?.name ??
    user?.roles?.[0]?.role ??
    "";

  return String(role).trim().toUpperCase();
}

export default function RequireRole({ allow = [], redirectTo = "/datasets", children }) {
  const { user, loading } = useAuth() || {};
  const loc = useLocation();

  if (loading) return null;

  const userRole = normalizeRole(user);
  const allowed = (allow || []).map((x) => String(x).trim().toUpperCase());

  if (!allowed.includes(userRole)) {
    return <Navigate to={redirectTo} replace state={{ from: loc.pathname }} />;
  }

  return children;
}