// routes/adminRoutes.js
import express from "express";
import {
  listPendingProducts,
  reviewProduct,
} from "../controllers/productController.js";
import { isAdmin, verifyToken } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import SellerRequest from "../models/SellerRequest.js";
import Shop from "../models/Shop.js";
import SystemSetting from "../models/SystemSettings.js";
import User from "../models/User.js";
import { io } from "../server.js";

const router = express.Router();

// list pending products
router.get("/products/pending", verifyToken, isAdmin, listPendingProducts);

// review a product (approve/reject)
router.post("/products/:id/review", verifyToken, isAdmin, reviewProduct);

// list seller requests
router.get("/seller-requests", verifyToken, isAdmin, async (req, res) => {
  try {
    const requests = await SellerRequest.find()
      .populate("userId", "name email")
      .populate("reviewerId", "name email");
    res.json(requests);
  } catch (err) {
    console.error("listSellerRequests error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// review a seller request
router.post(
  "/seller-requests/:id/review",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action, reviewNote } = req.body;
      const reqDoc = await SellerRequest.findById(id);
      if (!reqDoc)
        return res.status(404).json({ message: "Request not found" });

      reqDoc.status = action === "approve" ? "approved" : "rejected";
      reqDoc.reviewedAt = new Date();
      reqDoc.reviewerId = req.user?.id || req.user?.userId || null;
      reqDoc.reviewNote = reviewNote || "";
      await reqDoc.save();

      if (action === "approve") {
        let existingShop = await Shop.findOne({
          ownerId: reqDoc.userId,
          shopName: reqDoc.shopName,
        });

        if (!existingShop) {
          const shop = await Shop.create({
            ownerId: reqDoc.userId,
            shopName: reqDoc.shopName,
            logo: reqDoc.logo,
            address: reqDoc.address || "",
            phone: reqDoc.phone || "",
            website: reqDoc.website || "",
            businessLicenseUrl: reqDoc.businessLicenseUrl || "",
            description: reqDoc.description || "",
            status: "active",
          });
          await User.findByIdAndUpdate(reqDoc.userId, {
            role: "seller",
            sellerApproved: true,
            $addToSet: { shopIds: shop._id },
            shop: {
              shopId: shop._id,
              shopName: shop.shopName,
              logo: shop.logo,
            },
          });
        } else {
          await Shop.findByIdAndUpdate(existingShop._id, {
            shopName: reqDoc.shopName,
            logo: reqDoc.logo,
            address: reqDoc.address || "",
            phone: reqDoc.phone || "",
            website: reqDoc.website || "",
            businessLicenseUrl: reqDoc.businessLicenseUrl || "",
            description: reqDoc.description || "",
          });
          await User.findByIdAndUpdate(reqDoc.userId, {
            role: "seller",
            sellerApproved: true,
            $addToSet: { shopIds: existingShop._id },
            shop: {
              shopId: existingShop._id,
              shopName: existingShop.shopName,
              logo: existingShop.logo,
            },
          });
        }

        // emit socket notification
        if (io) {
          io.to(reqDoc.userId.toString()).emit("sellerRequest:approved", {
            requestId: reqDoc._id,
            message: "Your seller request has been approved!",
            ts: Date.now(),
          });
        }
      }

      res.json({ message: "Reviewed", request: reqDoc });
    } catch (err) {
      console.error("reviewSellerRequest error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);
/* ==========================
✅ GET SYSTEM SETTINGS
========================== */
router.get("/settings", verifyToken, isAdmin, async (req, res) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

/**
 * POST /api/admin/settings
 */
router.post("/settings", verifyToken, isAdmin, async (req, res) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create(req.body);
    } else {
      settings.autoApproveProducts =
        req.body.autoApproveProducts ?? settings.autoApproveProducts;
      settings.autoApproveSellers =
        req.body.autoApproveSellers ?? settings.autoApproveSellers;
      settings.smtp = req.body.smtp ?? settings.smtp;
      await settings.save();
    }

    // Nếu bật autoApproveProducts, duyệt luôn sản phẩm đang pending
    if (settings.autoApproveProducts) {
      const pendingProducts = await Product.find({ status: "pending" }).limit(
        10
      );
      for (const product of pendingProducts) {
        product.status = "approved";
        product.reviewedAt = new Date();
        product.reviewNote = "Auto approved by system";
        await product.save();

        // gửi notification qua socket.io
        if (product.sellerId) {
          io.to(product.sellerId.toString()).emit("product:approved", {
            productId: product._id,
            title: product.title,
            message: "Your product has been auto approved!",
            ts: Date.now(),
          });
        }
      }
    }

    // Nếu bật autoApproveSellers, duyệt luôn các yêu cầu seller pending
    if (settings.autoApproveSellers) {
      const pendingRequests = await (
        await import("../models/SellerRequest.js")
      ).default
        .find({ status: "pending" })
        .limit(10);
      const SellerRequest = (await import("../models/SellerRequest.js"))
        .default;
      const Shop = (await import("../models/Shop.js")).default;
      const User = (await import("../models/User.js")).default;

      for (const reqDoc of pendingRequests) {
        reqDoc.status = "approved";
        reqDoc.reviewedAt = new Date();
        reqDoc.reviewerId = null;
        reqDoc.reviewNote = "Auto approved by admin settings";
        await reqDoc.save();

        // create shop if needed
        let existingShop = await Shop.findOne({
          ownerId: reqDoc.userId,
          shopName: reqDoc.shopName,
        });

        if (!existingShop) {
          const shop = await Shop.create({
            ownerId: reqDoc.userId,
            shopName: reqDoc.shopName,
            logo: reqDoc.logo,
            address: reqDoc.address || "",
            phone: reqDoc.phone || "",
            website: reqDoc.website || "",
            businessLicenseUrl: reqDoc.businessLicenseUrl || "",
            description: reqDoc.description || "",
            status: "active",
          });

          await User.findByIdAndUpdate(reqDoc.userId, {
            role: "seller",
            sellerApproved: true,
            $addToSet: { shopIds: shop._id },
            shop: {
              shopId: shop._id,
              shopName: shop.shopName,
              logo: shop.logo,
            },
          });
        } else {
          await Shop.findByIdAndUpdate(existingShop._id, {
            shopName: reqDoc.shopName,
            logo: reqDoc.logo,
            address: reqDoc.address || "",
            phone: reqDoc.phone || "",
            website: reqDoc.website || "",
            businessLicenseUrl: reqDoc.businessLicenseUrl || "",
            description: reqDoc.description || "",
          });

          await User.findByIdAndUpdate(reqDoc.userId, {
            role: "seller",
            sellerApproved: true,
            $addToSet: { shopIds: existingShop._id },
            shop: {
              shopId: existingShop._id,
              shopName: existingShop.shopName,
              logo: existingShop.logo,
            },
          });
        }
      }
    }

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save settings" });
  }
});

export default router;
