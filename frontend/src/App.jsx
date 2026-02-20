// src/App.jsx
import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DatasetsPage from "./pages/DatasetsPage";
import NotFoundPage from "./pages/NotFoundPage";

import RequireAuth from "./auth/RequireAuth";
import PublicRoute from "./auth/PublicRoute";
import MainLayout from "./layout/MainLayout";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected (semua halaman setelah login) */}
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        {/* ✅ default route setelah login */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
      </Route>

      {/* Root: arahkan ke dashboard (RequireAuth yang akan meng-handle bila belum login) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}