import React, { useMemo } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import DatasetIcon from "@mui/icons-material/Dataset";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

const drawerWidth = 260;

function isActivePath(currentPath, itemPath) {
  if (itemPath === "/") return currentPath === "/";
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

export default function Sidebar() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();

  const role = String(user?.role || "").toUpperCase();

  const items = useMemo(() => {
    const base = [
      { label: "Dashboard", path: "/", icon: <DashboardIcon /> },

      // ✅ semua role dapat akses daftar dataset
      { label: "Kumpulan Data", path: "/datasets", icon: <DatasetIcon /> },
    ];

    const roleItems = [];

    if (role === "BIDANG") {
      roleItems.push({
        label: "Upload Dataset",
        path: "/upload",
        icon: <CloudUploadIcon />,
      });
    }

    if (role === "KEPALA_BIDANG") {
      roleItems.push({
        label: "Approvals Kabid",
        path: "/approvals/kabid",
        icon: <FactCheckIcon />,
      });
    }

    if (role === "PUSDATIN") {
      roleItems.push({
        label: "Approvals Pusdatin",
        path: "/approvals/pusdatin",
        icon: <AdminPanelSettingsIcon />,
      });
    }

    // kepala pusdatin: biasanya hanya melihat (dashboard + kumpulan data),
    // jadi tidak ada menu approval di sini kecuali kamu mau tambahkan.
    return [...base, ...roleItems];
  }, [role]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid rgba(0,0,0,0.08)",
        },
      }}
    >
      <Toolbar />

      {/* Header / Brand */}
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle1" fontWeight={800}>
          Portal Data New
        </Typography>
        <Typography variant="caption" color="text.secondary">
          DPRKP Prov. DKI Jakarta
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1, py: 1 }}>
        {items.map((it) => {
          const selected = isActivePath(loc.pathname, it.path);

          return (
            <ListItemButton
              key={it.path}
              selected={selected}
              onClick={() => nav(it.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                "&.Mui-selected": {
                  backgroundColor: "rgba(25, 118, 210, 0.12)",
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.16)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{it.icon}</ListItemIcon>
              <ListItemText
                primary={it.label}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: selected ? 700 : 500,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Footer user info */}
      <Box sx={{ mt: "auto", p: 2 }}>
        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="caption" color="text.secondary">
          Login sebagai
        </Typography>
        <Typography variant="body2" fontWeight={700}>
          {user?.username || "-"}
        </Typography>
      </Box>
    </Drawer>
  );
}
