import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box sx={{ flex: 1, bgcolor: "#f7f8fa" }}>
        <Topbar />
        <Box sx={{ p: 2 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
