import fs from "fs";
import Product from "../models/Product.js";
import cloudinary from "../utils/cloudinary.js";

export const listProducts = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const q = req.query.q;
    const filter = {};
    if (q) filter.title = new RegExp(q, "i");
    const [items, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { title, description, price, stock, categories, variants } = req.body;
    const files = req.files || [];
    let images = [];
    for (const f of files) {
      const r = await cloudinary.uploader.upload(f.path, {
        folder: "qq_products",
      });
      images.push(r.secure_url);
      try {
        fs.unlinkSync(f.path);
      } catch {}
    }
    const product = await Product.create({
      title,
      description,
      price: Number(price),
      stock: Number(stock || 0),
      images,
      categories: categories ? JSON.parse(categories) : [],
      variants: variants ? JSON.parse(variants) : {},
      sellerId,
    });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
