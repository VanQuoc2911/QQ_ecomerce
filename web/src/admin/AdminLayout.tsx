import { Box, CssBaseline } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

const AdminLayout: React.FC = () => {
  const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <Sidebar
        mobileOpen={mobileOpen}
        onToggle={handleDrawerToggle} variant={"permanent"}        // variant={isMobile ? "temporary" : "permanent"}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: theme.palette.background.default,
          minHeight: "100vh",
          transition: "all 0.3s",
        }}
      >
        <Topbar onSidebarToggle={handleDrawerToggle} />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
