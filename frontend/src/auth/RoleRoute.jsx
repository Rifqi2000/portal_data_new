import { Navigate } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import { useAuth } from "./useAuth";

export default function RoleRoute({ allow = [], children }) {
  const { user, loading } = useAuth();

  // Pastikan auth check jalan dulu
  return (
    <RequireAuth>
      {loading ? null : (() => {
        const role = String(user?.role || "").toUpperCase();
        const allowed = allow.map((x) => String(x).toUpperCase());
        const ok = !allowed.length || allowed.includes(role);

        if (!ok) return <Navigate to="/" replace />;
        return children;
      })()}
    </RequireAuth>
  );
}
