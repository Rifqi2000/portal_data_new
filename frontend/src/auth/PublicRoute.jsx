import { Navigate } from "react-router-dom";
import { getAccessToken } from "../utils/storage";

export default function PublicRoute({ children }) {
  const hasToken = !!getAccessToken();
  if (hasToken) return <Navigate to="/dashboard" replace />;
  return children;
}

