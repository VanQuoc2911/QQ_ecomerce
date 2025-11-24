import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";

// ✅ Lấy thông tin user
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ✅ Cập nhật thông tin user
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, avatar, shop } = req.body;
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.avatar = avatar || user.avatar;

    if (shop) user.shop = { ...user.shop, ...shop };

    // Accept addresses array including pinnedLocation when provided
    if (req.body.addresses && Array.isArray(req.body.addresses)) {
      user.addresses = req.body.addresses.map((addr) => ({
        id: addr.id,
        name: addr.name,
        phone: addr.phone,
        province: addr.province,
        district: addr.district,
        ward: addr.ward,
        detail: addr.detail,
        lat: addr.lat,
        lng: addr.lng,
        pinnedLocation: addr.pinnedLocation
          ? {
              lat: addr.pinnedLocation.lat ?? null,
              lng: addr.pinnedLocation.lng ?? null,
              pinnedAt: addr.pinnedLocation.pinnedAt
                ? new Date(addr.pinnedLocation.pinnedAt)
                : new Date(),
            }
          : { lat: null, lng: null, pinnedAt: null },
        type: addr.type || "home",
        isDefault: addr.isDefault || false,
        createdAt: addr.createdAt || new Date(),
      }));
    }

    await user.save();
    // Notify user about address/profile update
    try {
      const Notification = (await import("../models/Notification.js")).default;
      const notif = new Notification({
        userId: user._id,
        title: "Cập nhật địa chỉ",
        message: "Địa chỉ của bạn đã được cập nhật",
        type: "address",
        read: false,
        refId: user._id,
        url: `/profile`,
      });
      await notif.save();

      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();
        if (io) io.to(user._id.toString()).emit("notification:new", notif);
      } catch (emitErr) {
        console.warn("Failed to emit address update notification:", emitErr);
      }
    } catch (nErr) {
      console.warn("Failed to create address update notification:", nErr);
    }

    res.json({ message: "Cập nhật thành công", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi cập nhật thông tin" });
  }
};

// ✅ Lấy danh sách sản phẩm yêu thích của user
export const getFavoriteProducts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("favorites");
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    const favoriteIds = (user.favorites || []).map((id) => id.toString());
    if (favoriteIds.length === 0) {
      return res.json({ items: [], total: 0 });
    }

    const products = await Product.find({ _id: { $in: favoriteIds } })
      .populate("shopId", "shopName logo province")
      .lean();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const ordered = favoriteIds.map((id) => productMap.get(id)).filter(Boolean);

    res.json({ items: ordered, total: ordered.length });
  } catch (err) {
    console.error("getFavoriteProducts error", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ✅ Thêm sản phẩm vào yêu thích
export const addFavoriteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "productId không hợp lệ" });
    }

    const product = await Product.findById(productId).select("_id status");
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { favorites: product._id } },
      { new: true }
    ).select("favorites");

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json({
      message: "Đã thêm vào yêu thích",
      favorites: updatedUser.favorites.map((id) => id.toString()),
    });
  } catch (err) {
    console.error("addFavoriteProduct error", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ✅ Xóa sản phẩm khỏi yêu thích
export const removeFavoriteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "productId không hợp lệ" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { favorites: productId } },
      { new: true }
    ).select("favorites");

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json({
      message: "Đã xóa khỏi yêu thích",
      favorites: updatedUser.favorites.map((id) => id.toString()),
    });
  } catch (err) {
    console.error("removeFavoriteProduct error", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ✅ Đổi mật khẩu
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi đổi mật khẩu" });
  }
};
