import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RequireAuth from "./auth/RequireAuth";
import MainLayout from "./layout/MainLayout";

import DashboardPage from "./pages/DashboardPage";
import DatasetsPage from "./pages/DatasetsPage"; // contoh nanti

export default function App() {
  return (
    <Routes>
      {/* default */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* public */}
      <Route path="/login" element={<LoginPage />} />

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
