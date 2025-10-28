// src/admin/components/StatCard.tsx

import { Box, Card, CardContent, Typography } from "@mui/material";

export interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode; // ✅ THÊM DÒNG NÀY
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <Card elevation={3} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
          </Box>

          {/* ✅ optional icon */}
          {icon && (
            <Box sx={{ fontSize: 40 }}>
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
