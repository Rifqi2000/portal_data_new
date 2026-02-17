import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { useAuth } from "../auth/useAuth";
import { getRefreshToken } from "../utils/storage";

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <AppBar position="sticky" elevation={0} color="default" sx={{ borderBottom: "1px solid #eee" }}>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Portal Data DPRKP
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" sx={{ mr: 2 }}>
          {user?.username} • {user?.role}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => logout(getRefreshToken(), false)}
        >
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}
