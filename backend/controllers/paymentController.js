import dotenv from "dotenv";
dotenv.config();

const MOMO_ENDPOINT = process.env.MOMO_ENDPOINT;
const MOMO_PARTNER = process.env.MOMO_PARTNER_CODE;
const MOMO_ACCESS = process.env.MOMO_ACCESS_KEY;
const MOMO_SECRET = process.env.MOMO_SECRET_KEY;
const VNPAY_TMN = process.env.VNPAY_TMN_CODE;
const VNPAY_HASH = process.env.VNPAY_HASH_SECRET;
const VNPAY_BASE = process.env.VNPAY_BASE;
const VNPAY_RETURN = process.env.VNPAY_RETURN_URL;

export const createMomoPayment = async (req, res) => {
  try {
    // build payload as earlier example — requires momo sandbox keys
    const { amount, orderId, orderInfo, returnUrl } = req.body;
    // if keys not present, return error
    if (!MOMO_PARTNER || !MOMO_ACCESS || !MOMO_SECRET)
      return res.status(400).json({ message: "MoMo keys not configured" });
    // build signature & call endpoint...
    // For brevity, return placeholder
    return res.json({
      message: "MoMo endpoint ready. Implement with your keys.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "MoMo error" });
  }
};

export const createVnPayUrl = (req, res) => {
  try {
    if (!VNPAY_TMN || !VNPAY_HASH)
      return res.status(400).json({ message: "VNPay keys not configured" });
    const { amount, orderId, orderInfo } = req.body;
    // build signed URL as earlier example
    return res.json({
      message: "VNPay endpoint ready. Implement with your keys.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "VNPay error" });
  }
};
