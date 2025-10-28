import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import React from "react";
import { useAuth } from "../../context/AuthContext";

interface TopbarProps {
  onSidebarToggle: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onSidebarToggle }) => {
  const { user } = useAuth();

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "white", borderBottom: "1px solid #e5e5e5" }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onSidebarToggle}
          sx={{ display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography color="black" fontWeight={600}>
          Admin Dashboard
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography color="black">{user?.name}</Typography>
          <Avatar src={user?.avatar} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
