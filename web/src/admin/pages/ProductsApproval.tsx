import { Box, Button, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { productService } from "../../api/productService";
import type { Product } from "../../types/Product";

const ProductsApprovalPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getProducts({ status: "pending" })
      .then((res) => setProducts(res.products))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = (id: string | number) => {
    productService.updateProduct(id, { status: "approved" })
      .then(() => setProducts((prev) => prev.filter((p) => p.id !== id)));
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h5" mb={2}>Pending Products</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.title}</TableCell>
                <TableCell>{product.price.toLocaleString()}₫</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  <Button variant="contained" color="success" size="small" onClick={() => handleApprove(product.id)}>
                    Approve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ProductsApprovalPage;
