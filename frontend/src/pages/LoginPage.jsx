import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Checkbox,
  FormControlLabel,
  Divider,
  InputAdornment,
  IconButton,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

import { useAuth } from "../auth/useAuth"; // ✅ sesuai struktur kamu

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { login } = useAuth() || {};

  const from = useMemo(() => loc.state?.from || "/dashboard", [loc.state]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!login) {
      setErr("AuthProvider belum terpasang. Pastikan App dibungkus <AuthProvider>.");
      return;
    }

    try {
      setSubmitting(true);

      // login() kamu sudah set token + setUser
      await login(username, password);

      // optional: kalau mau "remember me" false => kamu bisa simpan token di sessionStorage
      // tapi saat ini storage kamu pakai localStorage. Jadi untuk sekarang remember hanya UI.
      // Kalau kamu mau, saya bisa ubah storage.js agar mendukung sessionStorage.

      nav(from, { replace: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.error?.message ||
        e2?.response?.data?.message ||
        e2?.message ||
        "Login gagal.";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Palet warna dari logo DPRKP (approx)
  const COLORS = {
    green: "#2E7D32",
    orange: "#F57C00",
    navy: "#0B3A53",
    bg: "#F6F8FB",
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1100,
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.08)",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.10)",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
          minHeight: { xs: "auto", md: 620 },
          bgcolor: "#fff",
        }}
      >
        {/* LEFT: Form */}
        <Box
          sx={{
            p: { xs: 3, sm: 5 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* top brand */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 4 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(46,125,50,0.10)",
                color: COLORS.green,
              }}
            >
              <LockOutlinedIcon />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.1, color: COLORS.navy }}>
                Portal Data DPRKP
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                DKI Jakarta
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              color: COLORS.navy,
              letterSpacing: -0.5,
              mb: 1,
            }}
          >
            Selamat datang kembali
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 3 }}>
            Login untuk melanjutkan ke dashboard.
          </Typography>

          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPass((v) => !v)}
                      edge="end"
                      size="small"
                    >
                      {showPass ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
                gap: 2,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    sx={{
                      color: COLORS.green,
                      "&.Mui-checked": { color: COLORS.green },
                    }}
                  />
                }
                label={<Typography variant="body2">Remember me</Typography>}
              />

              <Button
                variant="text"
                size="small"
                sx={{ textTransform: "none", color: COLORS.navy }}
                onClick={() => setErr("Fitur reset password belum tersedia (MVP).")}
              >
                Lupa password?
              </Button>
            </Box>

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={submitting || !login || !username || !password}
              sx={{
                py: 1.25,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 800,
                bgcolor: COLORS.green,
                "&:hover": { bgcolor: "#256628" },
                boxShadow: "0 10px 25px rgba(46, 125, 50, 0.25)",
              }}
            >
              {submitting ? "Memproses..." : "Sign In"}
            </Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Dengan login, Anda menyetujui kebijakan penggunaan Portal Data DPRKP.
            </Typography>
          </Box>
        </Box>

        {/* RIGHT: Illustration / Brand panel */}
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            position: "relative",
            p: 3,
            bgcolor: "rgba(11,58,83,0.06)",
          }}
        >
          {/* decorative blobs */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(900px 500px at 20% 20%, rgba(245,124,0,0.18), transparent 55%)," +
                "radial-gradient(700px 500px at 80% 30%, rgba(46,125,50,0.18), transparent 55%)," +
                "radial-gradient(800px 600px at 50% 85%, rgba(11,58,83,0.20), transparent 55%)",
            }}
          />

          <Box
            sx={{
              position: "relative",
              height: "100%",
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.06)",
              bgcolor: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(6px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              p: 4,
            }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 900, color: COLORS.navy, mb: 1 }}
              >
                Portal Data DPRKP
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>
                Akses cepat data, metadata, dan proses approval internal.
              </Typography>
            </Box>

            {/* simple “illustration” with MUI shapes (no external assets needed) */}
            <Box
              sx={{
                mt: 3,
                mb: 2,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2.2,
                  borderRadius: 3,
                  border: "1px solid rgba(0,0,0,0.06)",
                  bgcolor: "rgba(46,125,50,0.10)",
                }}
              >
                <Typography sx={{ fontWeight: 800, color: COLORS.green }}>
                  Terstruktur
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  CSV/XLSX
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.2,
                  borderRadius: 3,
                  border: "1px solid rgba(0,0,0,0.06)",
                  bgcolor: "rgba(245,124,0,0.10)",
                }}
              >
                <Typography sx={{ fontWeight: 800, color: COLORS.orange }}>
                  Approval
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Validasi cepat
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.2,
                  borderRadius: 3,
                  border: "1px solid rgba(0,0,0,0.06)",
                  bgcolor: "rgba(11,58,83,0.08)",
                }}
              >
                <Typography sx={{ fontWeight: 800, color: COLORS.navy }}>
                  API
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Konsumsi data
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.2,
                  borderRadius: 3,
                  border: "1px solid rgba(0,0,0,0.06)",
                  bgcolor: "rgba(46,125,50,0.08)",
                }}
              >
                <Typography sx={{ fontWeight: 800, color: COLORS.green }}>
                  Audit
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Jejak perubahan
                </Typography>
              </Paper>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                pt: 2,
                borderTop: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  bgcolor: COLORS.green,
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Sistem internal DPRKP DKI Jakarta
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
