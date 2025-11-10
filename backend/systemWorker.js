import SellerRequest from "./models/SellerRequest.js";
import Shop from "./models/Shop.js";
import User from "./models/User.js";

/**
 * Simple periodic worker: auto approve seller requests older than X
 * (example logic, only run in dev if you want)
 */
export const autoApproveSellerRequests = async () => {
  try {
    if (process.env.AUTO_APPROVE_SELLER !== "true") return;
    const pending = await SellerRequest.find({ status: "pending" }).limit(10);
    for (const r of pending) {
      r.status = "approved";
      r.reviewedAt = new Date();
      await r.save();

      // create shop if needed
      let existingShop = await Shop.findOne({
        ownerId: r.userId,
        shopName: r.shopName,
      });
      if (!existingShop) {
        const shop = await Shop.create({
          ownerId: r.userId,
          shopName: r.shopName,
          logo: r.logo,
          address: r.address || "",
          phone: r.phone || "",
          website: r.website || "",
          description: r.description || "",
          status: "active",
        });
        await User.findByIdAndUpdate(r.userId, {
          role: "seller",
          sellerApproved: true,
          $addToSet: { shopIds: shop._id },
          shop: { shopId: shop._id, shopName: shop.shopName, logo: shop.logo },
        });
      }
    }
  } catch (err) {
    console.error("autoApproveSellerRequests error", err);
  }
};
