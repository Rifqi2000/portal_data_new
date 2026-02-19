import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RequireAuth from "./auth/RequireAuth";
import PublicRoute from "./auth/PublicRoute";
import MainLayout from "./layout/MainLayout";
import { getAccessToken } from "./utils/storage";

import DashboardPage from "./pages/DashboardPage";
import DatasetsPage from "./pages/DatasetsPage";

export default function App() {
  const hasToken = !!getAccessToken();

  return (
    <Routes>
      {/* default: kalau sudah login => dashboard, kalau belum => login */}
      <Route path="/" element={<Navigate to={hasToken ? "/dashboard" : "/login"} replace />} />

      {/* public */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* protected layout */}
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        {/* route lain taruh sini */}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
