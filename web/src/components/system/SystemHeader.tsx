// src/components/system/SystemHeader.tsx
import { Logout } from "@mui/icons-material";
import { AppBar, IconButton, Toolbar, Typography } from "@mui/material";
import type { User } from "../../types";

interface SystemHeaderProps {
  user: User | null;
  onLogout: () => void;
}

export default function SystemHeader({ user, onLogout }: SystemHeaderProps) {
  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'text.primary' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Chào mừng, {user?.displayName || user?.email || "System Admin"}
        </Typography>
        <IconButton color="inherit" onClick={onLogout}>
          <Logout />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
