import Product from "../models/Product.js";

// 📝 List all pending products
export const listPendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: "pending" })
      .populate("sellerId", "name email")
      .populate("shopId", "shopName");
    res.json(products);
  } catch (err) {
    console.error("listPendingProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟢 Approve or Reject product
export const reviewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; // 'approve' | 'reject'

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.status = action === "approve" ? "approved" : "rejected";
    product.reviewNote = note || "";
    product.reviewedAt = new Date();
    product.reviewerId = req.user.id;

    await product.save();
    res.json({ message: `Product ${product.status}`, product });
  } catch (err) {
    console.error("reviewProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
