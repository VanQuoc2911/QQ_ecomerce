import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import api from "../../api/axios";

interface Order {
  _id: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function SellerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    const res = await api.get("/api/seller/orders");
    setOrders(res.data);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <Box>
      <Typography variant="h5" mb={2}>
        Đơn hàng của shop
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Mã đơn</TableCell>
            <TableCell>Khách hàng</TableCell>
            <TableCell>Thành tiền</TableCell>
            <TableCell>Trạng thái</TableCell>
            <TableCell>Ngày tạo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o._id}>
              <TableCell>{o._id}</TableCell>
              <TableCell>{o.customerName}</TableCell>
              <TableCell>{o.totalAmount.toLocaleString()} ₫</TableCell>
              <TableCell>{o.status}</TableCell>
              <TableCell>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
