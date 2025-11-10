import { Card, CardContent, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  icon?: ReactNode;
}

export default function SellerStatCard({ title, value, icon }: Props) {
  return (
    <Card sx={{ minWidth: 200, borderRadius: 2 }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {icon && <div style={{ fontSize: 32 }}>{icon}</div>}
        <div>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {value}
          </Typography>
        </div>
      </CardContent>
    </Card>
  );
}
