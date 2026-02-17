import { Drawer, List, ListItemButton, ListItemText, Toolbar } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const drawerWidth = 260;

export default function Sidebar() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();

  const role = String(user?.role || "").toUpperCase();

  const items = [
    { label: "Dashboard", path: "/" },
    ...(role === "BIDANG" ? [{ label: "Upload Dataset", path: "/upload" }] : []),
    ...(role === "KEPALA_BIDANG" ? [{ label: "Approvals Kabid", path: "/approvals/kabid" }] : []),
    ...(role === "PUSDATIN" ? [{ label: "Approvals Pusdatin", path: "/approvals/pusdatin" }] : []),
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
      }}
    >
      <Toolbar />
      <List>
        {items.map((it) => (
          <ListItemButton
            key={it.path}
            selected={loc.pathname === it.path}
            onClick={() => nav(it.path)}
          >
            <ListItemText primary={it.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
