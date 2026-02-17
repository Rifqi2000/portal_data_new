import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import RoleRoute from "../auth/RoleRoute";
import AppShell from "../components/AppShell";

import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import DatasetDetailPage from "../pages/DatasetDetailPage";
import ApprovalKabidPage from "../pages/ApprovalKabidPage";
import ApprovalPusdatinPage from "../pages/ApprovalPusdatinPage";
import NotFound from "../pages/NotFound";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "datasets/:id", element: <DatasetDetailPage /> },

      {
        path: "approvals/kabid",
        element: (
          <RoleRoute allow={["KEPALA_BIDANG", "KABID"]}>
            <ApprovalKabidPage />
          </RoleRoute>
        ),
      },
      {
        path: "approvals/pusdatin",
        element: (
          <RoleRoute allow={["PUSDATIN"]}>
            <ApprovalPusdatinPage />
          </RoleRoute>
        ),
      },

      { path: "*", element: <NotFound /> },
    ],
  },
]);
