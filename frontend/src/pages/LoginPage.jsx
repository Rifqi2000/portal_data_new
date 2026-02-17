import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import { useAuth } from "../auth/useAuth";

export default function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(username, password);
      nav("/", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.error?.message || "Login gagal.");
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#f7f8fa" }}>
      <Paper sx={{ p: 4, width: 420, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Portal Data DPRKP
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Login untuk melanjutkan
        </Typography>

        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <form onSubmit={onSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button fullWidth variant="contained" type="submit" size="large">
            Login
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
