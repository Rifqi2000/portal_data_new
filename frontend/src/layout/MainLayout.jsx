// src/layout/MainLayout.jsx
import { useMemo, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";

import { useAuth } from "../auth/useAuth";

const NAVY = "#0B3A53";
const DRAWER_OPEN = 280;
const DRAWER_CLOSED = 84;
const TOPBAR_H = 72;

export default function MainLayout() {
  const theme = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth() || {};

  const [collapsed, setCollapsed] = useState(false);

  const drawerW = collapsed ? DRAWER_CLOSED : DRAWER_OPEN;

  const items = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard", icon: <DashboardOutlinedIcon /> },
      { to: "/datasets", label: "Kumpulan Data", icon: <FolderOutlinedIcon /> },
    ],
    []
  );

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      nav("/login", { replace: true, state: { from: loc.pathname } });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        overflowX: "hidden",
      }}
    >
      {/* GRID WRAPPER: kolom kiri = sidebar, kanan = main content */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `${drawerW}px 1fr`,
          transition: "grid-template-columns 220ms ease",
          minHeight: "100vh",
        }}
      >
        {/* SIDEBAR */}
        <Box
          component="aside"
          sx={{
            position: "sticky",
            top: 0,
            height: "100vh",
            bgcolor: NAVY,
            color: "#E8EEF6",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Sidebar Header */}
          <Box
            sx={{
              height: TOPBAR_H,
              px: collapsed ? 1.25 : 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontWeight: 900,
                }}
              >
                PD
              </Avatar>

              {!collapsed && (
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, lineHeight: 1.05 }} noWrap>
                    Portal Data
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>
                    DPRKP Prov. DKI Jakarta
                  </Typography>
                </Box>
              )}
            </Box>

            <IconButton
              onClick={() => setCollapsed((v) => !v)}
              sx={{
                color: "#E8EEF6",
                bgcolor: "rgba(255,255,255,0.08)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                borderRadius: 2,
              }}
              size="small"
            >
              <MenuIcon />
            </IconButton>
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

          {/* Nav */}
          <List sx={{ px: 1.25, py: 1 }}>
            {items.map((it) => {
              const active = loc.pathname === it.to;

              return (
                <ListItemButton
                  key={it.to}
                  component={NavLink}
                  to={it.to}
                  sx={{
                    my: 0.5,
                    borderRadius: 999,
                    px: collapsed ? 1.25 : 1.6,
                    py: 1.1,
                    color: "#E8EEF6",
                    "& .MuiListItemIcon-root": { color: "inherit", minWidth: 40 },
                    bgcolor: active ? "rgba(46,125,50,0.20)" : "transparent",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                  }}
                >
                  <ListItemIcon>{it.icon}</ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={it.label}
                      primaryTypographyProps={{ fontWeight: 800 }}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </List>

          <Box sx={{ flex: 1 }} />

          {/* Footer user */}
          <Box
            sx={{
              px: collapsed ? 1.25 : 2,
              py: 2,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {!collapsed && (
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Login sebagai
              </Typography>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mt: 1 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontWeight: 900,
                }}
              >
                {(user?.username || "U").slice(0, 1).toUpperCase()}
              </Avatar>
              {!collapsed && (
                <Typography sx={{ fontWeight: 800 }} noWrap>
                  {user?.username || "-"}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* MAIN CONTENT */}
        <Box component="main" sx={{ minWidth: 0 }}>
          {/* TOPBAR */}
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              height: TOPBAR_H,
              bgcolor: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(10px)",
              borderBottom: "1px solid rgba(15,23,42,0.08)",
              color: "text.primary",
            }}
          >
            <Toolbar sx={{ height: TOPBAR_H, display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>
                DPRKP Prov. DKI Jakarta
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "rgba(46,125,50,0.12)",
                    color: theme.palette.primary.main,
                    fontWeight: 900,
                  }}
                >
                  {(user?.username || "U").slice(0, 1).toUpperCase()}
                </Avatar>

                <Typography sx={{ fontWeight: 700 }} noWrap>
                  {user?.username || "-"}
                </Typography>

                <Button
                  variant="contained"
                  onClick={handleLogout}
                  startIcon={<LogoutIcon />}
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    "&:hover": { bgcolor: "#256628" },
                    borderRadius: 999,
                    fontWeight: 900,
                    px: 2,
                  }}
                >
                  Logout
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          {/* PAGE CONTENT */}
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: 3,
              maxWidth: "100%",
              overflowX: "hidden",
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}