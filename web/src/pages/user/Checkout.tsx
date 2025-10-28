import { Box, Button, Container, TextField, Typography } from "@mui/material";

export default function Checkout() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Thanh toán</Typography>
      <Box display="flex" flexDirection="column" gap={2} maxWidth={400}>
        <TextField label="Họ và tên" fullWidth />
        <TextField label="Địa chỉ" fullWidth />
        <TextField label="Số điện thoại" fullWidth />
        <TextField label="Email" fullWidth />
        <Button variant="contained" color="primary">Xác nhận thanh toán</Button>
      </Box>
    </Container>
  );
}
