// src/App.jsx
import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DatasetsPage from "./pages/DatasetsPage";
import NotFoundPage from "./pages/NotFoundPage";
import CreateDatasetPage from "./pages/CreateDatasetPage";

import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import PublicRoute from "./auth/PublicRoute";
import MainLayout from "./layout/MainLayout";

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />

        {/* ✅ hanya BIDANG */}
        <Route
          path="/datasets/create"
          element={
            <RequireRole allow={["BIDANG"]}>
              <CreateDatasetPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}