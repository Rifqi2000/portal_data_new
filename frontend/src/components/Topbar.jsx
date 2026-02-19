import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "@mui/material";

export default function Topbar() {
  const nav = useNavigate();
  const { logout } = useAuth();

  const onLogout = async () => {
    await logout(false);
    nav("/login", { replace: true });
  };

  return (
    <Button variant="outlined" onClick={onLogout}>
      LOGOUT
    </Button>
  );
}
