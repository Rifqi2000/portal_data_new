import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import { useAuth } from "../auth/AuthProvider"; // pastikan sesuai file yang kamu buat

export default function LoginPage() {
  const nav = useNavigate();
  const auth = useAuth(); // ✅ jangan destructure langsung

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const login = auth?.login;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!login) {
      setErr("AuthProvider belum terpasang. Pastikan App dibungkus <AuthProvider>.");
      return;
    }

    try {
      setSubmitting(true);
      await login(username, password);
      nav("/dashboard", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.error?.message || e2?.message || "Login gagal.");
    } finally {
      setSubmitting(false);
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

        {!auth && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            AuthContext belum tersedia. Cek <code>{"<AuthProvider>"}</code> di main.jsx.
          </Alert>
        )}

        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
            autoComplete="username"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
            autoComplete="current-password"
          />
          <Button
            fullWidth
            variant="contained"
            type="submit"
            size="large"
            disabled={submitting || !login}
          >
            {submitting ? "Memproses..." : "Login"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
