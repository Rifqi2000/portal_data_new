// src/app/theme.js
import { createTheme } from "@mui/material/styles";

const DPRKP = {
  green: "#2E7D32",
  orange: "#F57C00",
  navy: "#0B3A53",
  bg: "#F6F8FB",
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: DPRKP.green },
    secondary: { main: DPRKP.navy },
    warning: { main: DPRKP.orange },
    background: { default: DPRKP.bg, paper: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "rgba(15,23,42,0.7)" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
    h4: { fontWeight: 900, letterSpacing: -0.4 },
    h5: { fontWeight: 900, letterSpacing: -0.2 },
    body1: { fontWeight: 500 },
    body2: { fontWeight: 500 },
    button: { fontWeight: 800, textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif` },
      },
    },
  },
});

export const COLORS = DPRKP;