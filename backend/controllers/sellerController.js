import SellerRequest from "../models/SellerRequest.js";
import User from "../models/User.js";

/** list seller requests (admin) */
export const listSellerRequests = async (req, res) => {
  try {
    const items = await SellerRequest.find().populate("userId", "name email");
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** review a request (admin or system) */
export const reviewSellerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reviewNote } = req.body; // action: 'approve'|'reject'
    const reqDoc = await SellerRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });

    reqDoc.status = action === "approve" ? "approved" : "rejected";
    reqDoc.reviewedAt = new Date();
    reqDoc.reviewerId = req.user.id; // can be system's pseudo-id
    reqDoc.reviewNote = reviewNote || "";
    await reqDoc.save();

    if (action === "approve") {
      // update user role and shop info
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
    }

    return res.json({ message: "Reviewed", request: reqDoc });
  } catch (err) {
    console.error("reviewSellerRequest error", err);
    return res.status(500).json({ message: "Server error" });
  }
};
