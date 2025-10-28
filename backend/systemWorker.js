import SellerRequest from "./models/SellerRequest.js";
import User from "./models/User.js";

/**
 * autoApproveSellerRequests
 * Basic rule: if shopName length >= 3 and logo present -> approve automatically.
 * You can extend rules: businessLicenseUrl present, phone format, etc.
 * When approved: set SellerRequest.status='approved', set reviewedAt, reviewerId='system', update user.role->seller, sellerApproved=true, and copy shop info to user.shop.
 */
export const autoApproveSellerRequests = async () => {
  const pending = await SellerRequest.find({ status: "pending" }).limit(20);
  if (!pending || pending.length === 0) return;

  console.log(
    `[systemWorker] found ${pending.length} pending seller request(s)`
  );

  for (const reqDoc of pending) {
    try {
      const meets =
        reqDoc.shopName &&
        reqDoc.shopName.trim().length >= 3 &&
        reqDoc.logo &&
        reqDoc.logo.trim().length > 5;
      if (meets) {
        reqDoc.status = "approved";
        reqDoc.reviewedAt = new Date();
        reqDoc.reviewerId = null; // system
        reqDoc.reviewNote = "Auto-approved by system rules";
        await reqDoc.save();

        // update user
        await User.findByIdAndUpdate(reqDoc.userId, {
          role: "seller",
          sellerApproved: true,
          shop: {
            shopName: reqDoc.shopName,
            logo: reqDoc.logo,
            address: reqDoc.address || "",
            phone: reqDoc.phone || "",
            website: reqDoc.website || "",
            businessLicenseUrl: reqDoc.businessLicenseUrl || "",
            description: reqDoc.description || "",
          },
        });

        console.log(
          `[systemWorker] auto-approved seller request ${reqDoc._id} (user ${reqDoc.userId})`
        );
        // TODO: here you can trigger notification/email to user
      } else {
        // skip (requires admin review)
        console.log(
          `[systemWorker] request ${reqDoc._id} does not meet auto-approve criteria`
        );
      }
    } catch (err) {
      console.error("[systemWorker] error processing request", reqDoc._id, err);
    }
  }
};
