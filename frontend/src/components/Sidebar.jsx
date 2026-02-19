import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";

import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

import { COLORS } from "../app/theme";
import { useAuth } from "../auth/useAuth";

function Item({ to, icon, label, collapsed }) {
  return (
    <ListItemButton
      component={NavLink}
      to={to}
      sx={{
        mx: 1.2,
        my: 0.5,
        borderRadius: 2,
        "&.active": {
          bgcolor: "rgba(46,125,50,0.12)",
          color: COLORS.green,
          "& .MuiListItemIcon-root": { color: COLORS.green },
        },
      }}
    >
      <Tooltip title={collapsed ? label : ""} placement="right">
        <ListItemIcon sx={{ minWidth: 42, color: "text.secondary" }}>
          {icon}
        </ListItemIcon>
      </Tooltip>
      {!collapsed && <ListItemText primary={label} />}
    </ListItemButton>
  );
}

export default function Sidebar({ width = 272, collapsed = false, onToggle }) {
  const { user } = useAuth();
  const loc = useLocation();

  return (
    <Drawer
      variant="permanent"
      PaperProps={{
        sx: {
          width,
          transition: "width .2s ease",
          overflowX: "hidden",
          bgcolor: "#fff",
          borderRight: "1px solid rgba(0,0,0,0.06)",
        },
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 2, py: 2.2, display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.2,
            bgcolor: "rgba(11,58,83,0.08)",
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            color: COLORS.navy,
          }}
        >
          PD
        </Box>

        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, color: COLORS.navy, lineHeight: 1.1 }}>
              Portal Data New
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              DPRKP Prov. DKI Jakarta
            </Typography>
          </Box>
        )}

        <Box sx={{ ml: "auto" }}>
          <IconButton onClick={onToggle} size="small">
            {collapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
          </IconButton>
        </Box>
      </Box>

      <Divider />

      {/* Menu */}
      <List sx={{ py: 1 }}>
        <Item
          to="/dashboard"
          icon={<DashboardOutlinedIcon />}
          label="Dashboard"
          collapsed={collapsed}
        />
        <Item
          to="/datasets"
          icon={<FolderOutlinedIcon />}
          label="Kumpulan Data"
          collapsed={collapsed}
        />
        <Item
          to="/upload"
          icon={<CloudUploadOutlinedIcon />}
          label="Upload Dataset"
          collapsed={collapsed}
        />
      </List>

      <Box sx={{ flex: 1 }} />

      {/* Footer user */}
      <Divider />
      <Box sx={{ px: 2, py: 2 }}>
        {!collapsed ? (
          <>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Login sebagai
            </Typography>
            <Typography sx={{ fontWeight: 900 }}>{user?.username}</Typography>
          </>
        ) : (
          <Tooltip title={`Login: ${user?.username || "-"}`} placement="right">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: 99,
                bgcolor: COLORS.green,
                mx: "auto",
              }}
            />
          </Tooltip>
        )}
      </Box>
    </Drawer>
  );
}
