import { Box, Paper, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useCart } from "../../context/CartContext";

export default function CartDropdown() {
  const { cart, total } = useCart();

  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      sx={{
        position: "absolute",
        right: 20,
        top: 60,
        width: 300,
        borderRadius: 3,
        boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
        background: "#fff",
        p: 2,
        zIndex: 999,
      }}
    >
      <Typography fontWeight="bold" mb={1}>
        🛒 Giỏ hàng của bạn
      </Typography>
      {cart.length === 0 ? (
        <Typography fontSize={14} color="text.secondary">
          Giỏ hàng trống
        </Typography>
      ) : (
        <>
          {cart.map((item) => (
            <Box
              key={item._id}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={1}
            >
              <Typography fontSize={14}>{item.title}</Typography>
              <Typography fontSize={14} fontWeight="bold">
                {item.price.toLocaleString()}₫
              </Typography>
            </Box>
          ))}
          <Box mt={1} borderTop="1px solid #eee" pt={1} display="flex" justifyContent="space-between">
            <Typography fontWeight="bold">Tổng:</Typography>
            <Typography fontWeight="bold" color="primary">
              {total.toLocaleString()}₫
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
}
