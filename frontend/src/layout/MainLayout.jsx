import { Outlet, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Stack,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

import Sidebar from "../components/Sidebar";
import { useAuth } from "../auth/useAuth";
import { COLORS } from "../app/theme";
import React, { useState } from "react";


const DRAWER_WIDTH = 272;
const DRAWER_COLLAPSED = 84;

export default function MainLayout() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  const drawerW = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const onLogout = async () => {
    await logout(false);
    nav("/login", { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* SIDEBAR */}
      <Sidebar
        width={drawerW}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      {/* MAIN */}
      <Box
        sx={{
          ml: `${drawerW}px`,
          transition: "margin-left .2s ease",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* TOPBAR */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            color: "text.primary",
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            {/* left toggle (useful on small screens too) */}
            {/* <IconButton
              onClick={() => setCollapsed((v) => !v)}
              sx={{ display: { xs: "inline-flex", md: "inline-flex" } }}
            >
              <MenuIcon />
            </IconButton> */}

            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 900, color: COLORS.navy, lineHeight: 1 }}>
                Portal Data DPRKP
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                DPRKP Prov. DKI Jakarta
              </Typography>
            </Box>

            {/* right user */}
            <Stack direction="row" alignItems="center" spacing={1.2}>
              
              <Stack direction="row" alignItems="center" spacing={1}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: "rgba(46,125,50,0.14)",
                    color: COLORS.green,
                    fontWeight: 900,
                  }}
                >
                  {(user?.username || "U").slice(0, 1).toUpperCase()}
                </Avatar>
                <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>
                  {user?.username}
                </Typography>
              </Stack>

              <Button
                variant="contained"
                onClick={onLogout}
                startIcon={<LogoutOutlinedIcon />}
                sx={{
                  bgcolor: COLORS.green,
                  "&:hover": { bgcolor: "#256628" },
                  boxShadow: "0 10px 25px rgba(46,125,50,0.22)",
                }}
              >
                Logout
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* CONTENT */}
        <Box sx={{ px: { xs: 2, md: 3 }, py: 3, flex: 1 }}>
          <Outlet />
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 2,
            borderTop: "1px solid rgba(0,0,0,0.06)",
            color: "text.secondary",
            fontSize: 12,
          }}
        >
          Sistem internal DPRKP DKI Jakarta • {new Date().getFullYear()}
        </Box>
      </Box>
    </Box>
  );
}
