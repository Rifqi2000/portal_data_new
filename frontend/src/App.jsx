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

// ✅ Placeholder pages (buat dulu, nanti diisi)
import DatasetFilesPage from "./pages/datasets/DatasetFilesPage";
import DatasetUploadPage from "./pages/datasets/DatasetUploadPage";
import DatasetDetailPage from "./pages/datasets/DatasetDetailPage";
import DatasetEditPage from "./pages/datasets/DatasetEditPage";
import DatasetLogsPage from "./pages/datasets/DatasetLogsPage";
import DatasetVisualizePage from "./pages/datasets/DatasetVisualizePage";
import DatasetApproveKabidPage from "./pages/datasets/DatasetApproveKabidPage";
import DatasetApprovePusdatinPage from "./pages/datasets/DatasetApprovePusdatinPage";

// ✅ NEW: Preview page
import DatasetPreviewPage from "./pages/datasets/DatasetPreviewPage";

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

        {/* =========================
            DATASETS LIST
        ========================= */}
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

        {/* =========================
            DATASETS ACTION ROUTES
        ========================= */}

        {/* 1. Lihat Filedata */}
        <Route path="/datasets/:datasetId/files" element={<DatasetFilesPage />} />

        {/* ✅ NEW: Preview Data */}
        <Route path="/datasets/:datasetId/preview" element={<DatasetPreviewPage />} />

        {/* 2. Upload Filedata (ROLE BIDANG) */}
        <Route
          path="/datasets/:datasetId/upload"
          element={
            <RequireRole allow={["BIDANG"]}>
              <DatasetUploadPage />
            </RequireRole>
          }
        />

        {/* 3. Lihat MetaData (detail) */}
        <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />

        {/* 4. Edit MetaData (ROLE BIDANG) */}
        <Route
          path="/datasets/:datasetId/edit"
          element={
            <RequireRole allow={["BIDANG"]}>
              <DatasetEditPage />
            </RequireRole>
          }
        />

        {/* 5. Pelacakan Data */}
        <Route path="/datasets/:datasetId/logs" element={<DatasetLogsPage />} />

        {/* 6. Visualisasi Data */}
        <Route path="/datasets/:datasetId/visualize" element={<DatasetVisualizePage />} />

        {/* 8. Approve Kepala Bidang (ROLE KEPALA_BIDANG) */}
        <Route
          path="/datasets/:datasetId/approve-kabid"
          element={
            <RequireRole allow={["KEPALA_BIDANG"]}>
              <DatasetApproveKabidPage />
            </RequireRole>
          }
        />

        {/* 9. Approve Pusdatin (ROLE PUSDATIN/KEPALA_PUSDATIN) */}
        <Route
          path="/datasets/:datasetId/approve-pusdatin"
          element={
            <RequireRole allow={["PUSDATIN", "KEPALA_PUSDATIN"]}>
              <DatasetApprovePusdatinPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}