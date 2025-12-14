// routes/adminRoutes.js
import express from "express";
import {
  createAnnouncement,
  listAnnouncements,
} from "../controllers/announcementController.js";
import {
  listPendingProducts,
  reviewProduct,
} from "../controllers/productController.js";
import { isAdmin, verifyToken } from "../middleware/authMiddleware.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import SellerRequest from "../models/SellerRequest.js";
import ShipperApplication from "../models/ShipperApplication.js";
import Shop from "../models/Shop.js";
import SystemSetting from "../models/SystemSettings.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { invalidateEmailTransporter } from "../utils/emailService.js";

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

/* ==========================
✅ CATEGORY MANAGEMENT (ADMIN)
Routes: GET /categories (list), POST /categories (create), PUT /categories/:id, DELETE /categories/:id
Emits: 'categories:updated' to all connected clients after changes
========================== */
router.get("/categories", verifyToken, isAdmin, async (req, res) => {
  try {
    const categories = await Category.find().sort({ id: 1 }).lean();
    res.json(categories);
  } catch (err) {
    console.error("admin GET /categories error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/categories", verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });

    // set id to next numeric if not provided
    const max = await Category.findOne().sort({ id: -1 }).select("id");
    const nextId = max && max.id ? max.id + 1 : 1;

    const created = await Category.create({ id: nextId, name, description });

    // emit update to clients
    if (io) {
      const fresh = await Category.find().sort({ id: 1 }).lean();
      io.emit("categories:updated", fresh);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("admin POST /categories error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/categories/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const filter = isNaN(id) ? { _id: id } : { id: Number(id) };
    const updated = await Category.findOneAndUpdate(filter, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });

    if (io) {
      const fresh = await Category.find().sort({ id: 1 }).lean();
      io.emit("categories:updated", fresh);
    }

    res.json(updated);
  } catch (err) {
    console.error("admin PUT /categories/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/categories/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const filter = isNaN(id) ? { _id: id } : { id: Number(id) };
    const removed = await Category.findOneAndDelete(filter);
    if (!removed) return res.status(404).json({ message: "Not found" });

    if (io) {
      const fresh = await Category.find().sort({ id: 1 }).lean();
      io.emit("categories:updated", fresh);
    }

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("admin DELETE /categories/:id error:", err);
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

// list shipper requests (admin)
router.get(
  "/shipper-requests",
  verifyToken,
  isAdmin,
  // delegate to shipper application controller
  async (req, res) => {
    try {
      // return array to match /seller-requests format
      const requests = await ShipperApplication.find()
        .populate("userId", "name email phone")
        .populate("review.reviewerId", "name email");
      return res.json(requests);
    } catch (err) {
      console.error("listShipperRequests error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// get shipper application detail
router.get("/shipper-requests/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await ShipperApplication.findById(id).populate(
      "userId",
      "name email phone"
    );
    if (!application) return res.status(404).json({ message: "Not found" });
    return res.json(application);
  } catch (err) {
    console.error("getShipperRequestDetail error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// review a shipper request
router.post(
  "/shipper-requests/:id/review",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action, reviewNote } = req.body;
      const decision = action === "approve" ? "approved" : "rejected";

      const application = await ShipperApplication.findById(id);
      if (!application) return res.status(404).json({ message: "Not found" });

      application.status = decision;
      application.review = {
        reviewerId: req.user.id,
        note: reviewNote || "",
        decidedAt: new Date(),
      };
      application.history.push({
        action: decision,
        note:
          reviewNote ||
          (decision === "approved" ? "Duyệt hồ sơ" : "Từ chối hồ sơ"),
        actorId: req.user.id,
      });
      await application.save();

      // update user role if approved
      const user = await User.findById(application.userId);
      if (user) {
        if (decision === "approved") {
          user.role = "shipper";
          user.shipperApproved = true;
        }
        await user.save();
      }

      return res.json({ message: "Reviewed", application });
    } catch (err) {
      console.error("reviewShipperRequest error:", err);
      return res.status(500).json({ message: "Server error" });
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
      settings = new SystemSetting();
    }

    settings.autoApproveProducts =
      req.body.autoApproveProducts ?? settings.autoApproveProducts;
    settings.autoApproveSellers =
      req.body.autoApproveSellers ?? settings.autoApproveSellers;
    settings.smtp = req.body.smtp ?? settings.smtp;

    if (req.body.serviceFeePercent !== undefined) {
      const parsedPercent = Number(req.body.serviceFeePercent);
      if (Number.isNaN(parsedPercent)) {
        return res
          .status(400)
          .json({ message: "serviceFeePercent must be a number" });
      }
      settings.serviceFeePercent = Math.min(Math.max(parsedPercent, 0), 100);
    }

    if (req.body.sellerServiceFeePercent !== undefined) {
      const parsedPercent = Number(req.body.sellerServiceFeePercent);
      if (Number.isNaN(parsedPercent)) {
        return res
          .status(400)
          .json({ message: "sellerServiceFeePercent must be a number" });
      }
      settings.sellerServiceFeePercent = Math.min(
        Math.max(parsedPercent, 0),
        100
      );
    }

    await settings.save();
    invalidateEmailTransporter();

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

router.get("/announcements", verifyToken, isAdmin, listAnnouncements);
router.post("/announcements", verifyToken, isAdmin, createAnnouncement);

export default router;
