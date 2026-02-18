import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";

export default function Topbar() {
  return (
    <AppBar position="fixed" color="default" elevation={1}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography fontWeight={800}>Portal Data DPRKP</Typography>

        <Box>
          <Button variant="outlined" size="small">
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
