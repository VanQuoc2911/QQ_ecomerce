import { Box, Typography } from "@mui/material";

export default function Footer() {
  return (
    <Box sx={{ textAlign: "center", py: 3, bgcolor: "#f5f5f5", mt: 4 }}>
      <Typography variant="body2" color="textSecondary">
        © 2025 QQ Electronics. All rights reserved.
      </Typography>
    </Box>
  );
}
