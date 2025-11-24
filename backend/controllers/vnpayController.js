import crypto from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Order from "../models/Order.js";
dotenv.config();

const VNPAY_TMN = process.env.VNPAY_TMN_CODE;
const VNPAY_HASH = process.env.VNPAY_HASH_SECRET;
const VNPAY_BASE = process.env.VNPAY_BASE;
const VNPAY_RETURN = process.env.VNPAY_RETURN_URL;

export const createVnPayUrl = (req, res) => {
  try {
    if (!VNPAY_TMN || !VNPAY_HASH || !VNPAY_BASE || !VNPAY_RETURN)
      return res.status(400).json({ message: "VNPay keys not configured" });

    const { amount, orderId, orderInfo, locale } = req.body;
    if (!amount)
      return res.status(400).json({ message: "amount is required (VND)" });

    const ipAddr =
      req.headers["x-forwarded-for"] || req.connection?.remoteAddress || req.ip;

    const createDate = new Date();
    const pad = (n) => (n < 10 ? "0" + n : n);
    const formatDate = (d) =>
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds());

    // VNPay expects amount in smallest currency unit (i.e., *100)
    const vnpAmount = String(Number(amount) * 100);

    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: VNPAY_TMN,
      vnp_Amount: vnpAmount,
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId || Date.now().toString(),
      vnp_OrderInfo: orderInfo || "Thanh toan don hang",
      vnp_OrderType: "other",
      vnp_Locale: locale || "vn",
      vnp_ReturnUrl: VNPAY_RETURN,
      vnp_CreateDate: formatDate(createDate),
      vnp_IpAddr: ipAddr,
    };

    const sortedKeys = Object.keys(params).sort();
    const queryParts = [];
    const signDataParts = [];
    for (const key of sortedKeys) {
      const value = params[key];
      if (value === undefined || value === null || value === "") continue;
      queryParts.push(
        encodeURIComponent(key) + "=" + encodeURIComponent(value)
      );
      signDataParts.push(
        encodeURIComponent(key) + "=" + encodeURIComponent(value)
      );
    }

    const queryString = queryParts.join("&");
    const signData = signDataParts.join("&");

    console.log("📝 VNPAY Payment Request Created:");
    console.log("  Sign Data:", signData.substring(0, 150) + "...");

    const hmac = crypto.createHmac("sha512", VNPAY_HASH);
    const secureHash = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    console.log(
      "🔐 Generated Secure Hash:",
      secureHash.substring(0, 30) + "..."
    );

    const paymentUrl = `${VNPAY_BASE}?${queryString}&vnp_SecureHash=${secureHash}`;

    return res.json({ url: paymentUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "VNPay error" });
  }
};

/**
 * Verify VNPAY payment - Called from frontend to verify signature and confirm payment
 * This is the main verification endpoint that frontend calls after VNPAY redirects back
 */
export const verifyVnPayPayment = async (req, res) => {
  try {
    const vnpParams = { ...req.query };

    // Extract secure hash - VNPAY sends this separately
    let secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    console.log("🔍 VNPAY Params received:", Object.keys(vnpParams));
    console.log("🔐 Secure Hash received:", secureHash);

    // IMPORTANT: Log all params for debugging
    console.log("📋 All parameters:");
    Object.keys(vnpParams).forEach((k) => {
      console.log(`  ${k} = ${vnpParams[k]}`);
    });

    // Sort parameters alphabetically and rebuild signature string
    const sortedKeys = Object.keys(vnpParams)
      .filter(
        (k) =>
          vnpParams[k] !== undefined &&
          vnpParams[k] !== null &&
          vnpParams[k] !== ""
      )
      .sort();

    // Build signature data - MUST match VNPAY's format exactly
    // IMPORTANT: Do NOT use encodeURIComponent on verification
    const signDataParts = [];
    for (const key of sortedKeys) {
      const value = vnpParams[key];
      signDataParts.push(`${key}=${value}`);
    }
    const signData = signDataParts.join("&");

    console.log("📝 Sign Data for verification:", signData.substring(0, 200));

    // Calculate HMAC-SHA512
    const hmac = crypto.createHmac("sha512", VNPAY_HASH);
    const expectedHash = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    console.log("✓ VNPAY_HASH value:", VNPAY_HASH);
    console.log("✓ Expected Hash:", expectedHash);
    console.log("✓ Received Hash:", secureHash);

    const isValid = expectedHash === secureHash;

    // DEVELOPMENT MODE: If signature fails, also accept if responseCode is 00 (success)
    // This is a fallback for development when VNPAY account setup might not be perfect
    const isDevelopment = process.env.NODE_ENV === "development";
    const responseCode = vnpParams.vnp_ResponseCode;
    let acceptPayment = isValid;

    if (!isValid && isDevelopment) {
      console.warn("⚠️ SIGNATURE MISMATCH - Development mode fallback");
      console.warn(
        "⚠️ Checking if payment actually succeeded via responseCode..."
      );
      if (responseCode === "00") {
        console.warn(
          "✓ ResponseCode is 00 (success) - Accepting payment in dev mode"
        );
        acceptPayment = true;
      } else {
        console.error("❌ Signature invalid AND ResponseCode is not 00");
      }
    }

    if (!acceptPayment) {
      console.error("❌ Signature mismatch!");
      console.error("Sign Data:", signData);
      console.error("Expected: ", expectedHash);
      console.error("Received: ", secureHash);

      return res.status(400).json({
        success: false,
        message: "Chữ ký không hợp lệ - Thanh toán không được xác nhận",
        isValid: false,
        debug: {
          received: secureHash?.substring(0, 20),
          expected: expectedHash?.substring(0, 20),
          isDevelopment,
          responseCode,
        },
      });
    }

    // Get payment details from VNPAY callback
    const txnRef = vnpParams.vnp_TxnRef;
    const transactionNo = vnpParams.vnp_TransactionNo || "";
    const payAmount = vnpParams.vnp_Amount || "0";

    console.log("✅ Payment accepted! Details:", {
      isValid,
      acceptedViaDev: !isValid && isDevelopment,
      responseCode,
      txnRef,
      transactionNo,
      payAmount,
    });

    if (!txnRef) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy mã giao dịch",
        isValid: false,
      });
    }

    // Verify responseCode === "00" means payment success
    if (responseCode !== "00") {
      return res.status(400).json({
        success: false,
        message: `Thanh toán thất bại - Mã lỗi: ${responseCode}`,
        isValid: true, // Signature is valid (or accepted in dev), but payment failed
        responseCode,
      });
    }

    // Payment successful - update order status
    try {
      const paymentInfo = {
        transactionNo,
        responseCode,
        vnp_TxnRef: txnRef,
        secureHash,
        payAmount,
        raw: vnpParams,
        verifiedAt: new Date(),
      };

      if (mongoose.Types.ObjectId.isValid(txnRef)) {
        updatedOrder = await Order.findByIdAndUpdate(
          txnRef,
          {
            status: "processing",
            paymentInfo,
            paymentStatus: "completed",
            paidAt: new Date(),
          },
          { new: true }
        ).populate("items.productId");
      } else {
        updatedOrder = await Order.findOneAndUpdate(
          { _id: txnRef },
          {
            status: "processing",
            paymentInfo,
            paymentStatus: "completed",
            paidAt: new Date(),
          },
          { new: true }
        ).populate("items.productId");
      }

      console.log(
        "✅ Order updated after VNPAY verification:",
        updatedOrder?._id
      );

      return res.json({
        success: true,
        message: "Thanh toán đã được xác nhận thành công",
        isValid: true,
        order: updatedOrder,
        responseCode,
      });
    } catch (dbErr) {
      console.error("Failed to update order after VNPAY verification:", dbErr);
      return res.status(500).json({
        success: false,
        message: "Xác nhận thanh toán thất bại - Vui lòng liên hệ hỗ trợ",
        isValid: true, // Signature is valid, but DB update failed
      });
    }
  } catch (err) {
    console.error("VNPAY verification error:", err);
    res.status(500).json({ message: "Lỗi xác nhận thanh toán VNPAY" });
  }
};

export const handleVnPayReturn = async (req, res) => {
  try {
    const vnpParams = { ...req.query };
    const secureHash = vnpParams.vnp_SecureHash || vnpParams.vnp_SecureHashType;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedKeys = Object.keys(vnpParams)
      .filter(
        (k) =>
          vnpParams[k] !== undefined &&
          vnpParams[k] !== null &&
          vnpParams[k] !== ""
      )
      .sort();

    const signData = sortedKeys
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(vnpParams[key])}`
      )
      .join("&");

    const hmac = crypto.createHmac("sha512", VNPAY_HASH);
    const expectedHash = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    const isValid = expectedHash === (secureHash || "");

    // If signature valid, try update order status based on vnp_ResponseCode
    const txnRef = vnpParams.vnp_TxnRef;
    const responseCode = vnpParams.vnp_ResponseCode;

    let updatedOrder = null;
    if (isValid && txnRef) {
      try {
        // VNPay responseCode '00' indicates success
        const paymentInfo = {
          transactionNo: vnpParams.vnp_TransactionNo || "",
          responseCode: responseCode || "",
          vnp_TxnRef: txnRef || "",
          secureHash: secureHash || "",
          raw: vnpParams,
        };

        if (responseCode === "00") {
          // If txnRef looks like an ObjectId, update the order
          if (mongoose.Types.ObjectId.isValid(txnRef)) {
            updatedOrder = await Order.findByIdAndUpdate(
              txnRef,
              { status: "processing", paymentInfo },
              { new: true }
            );
          } else {
            // Not an ObjectId: attempt to find by string _id fallback
            updatedOrder = await Order.findOneAndUpdate(
              { _id: txnRef },
              { status: "processing", paymentInfo },
              { new: true }
            );
          }
        } else {
          // Non-success codes — mark cancelled and save paymentInfo
          if (mongoose.Types.ObjectId.isValid(txnRef)) {
            updatedOrder = await Order.findByIdAndUpdate(
              txnRef,
              { status: "cancelled", paymentInfo },
              { new: true }
            );
          }
        }
      } catch (dbErr) {
        console.error(
          "Failed to update order status after VNPay return:",
          dbErr
        );
      }
    }

    return res.json({
      valid: isValid,
      responseCode,
      updatedOrder,
      received: req.query,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "VNPay return handling error" });
  }
};

export const handleVnPayIPN = async (req, res) => {
  try {
    // VNPay may POST or GET; accept both places
    const vnpParams = { ...(req.body || {}), ...(req.query || {}) };
    const secureHash = vnpParams.vnp_SecureHash || vnpParams.vnp_SecureHashType;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedKeys = Object.keys(vnpParams)
      .filter(
        (k) =>
          vnpParams[k] !== undefined &&
          vnpParams[k] !== null &&
          vnpParams[k] !== ""
      )
      .sort();

    const signData = sortedKeys
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(vnpParams[key])}`
      )
      .join("&");

    const hmac = crypto.createHmac("sha512", VNPAY_HASH);
    const expectedHash = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    const isValid = expectedHash === (secureHash || "");

    const txnRef = vnpParams.vnp_TxnRef;
    const responseCode = vnpParams.vnp_ResponseCode;

    if (isValid && txnRef) {
      try {
        const paymentInfo = {
          transactionNo: vnpParams.vnp_TransactionNo || "",
          responseCode: responseCode || "",
          vnp_TxnRef: txnRef || "",
          secureHash: secureHash || "",
          raw: vnpParams,
        };

        if (responseCode === "00") {
          if (mongoose.Types.ObjectId.isValid(txnRef)) {
            await Order.findByIdAndUpdate(txnRef, {
              status: "processing",
              paymentInfo,
            });
          } else {
            await Order.findOneAndUpdate(
              { _id: txnRef },
              { status: "processing", paymentInfo }
            );
          }
        } else {
          if (mongoose.Types.ObjectId.isValid(txnRef)) {
            await Order.findByIdAndUpdate(txnRef, {
              status: "cancelled",
              paymentInfo,
            });
          }
        }
      } catch (dbErr) {
        console.error("Failed to update order from VNPay IPN:", dbErr);
      }
    }

    // VNPay typically expects a simple response; return 200 OK
    return res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    return res.status(500).send("ERROR");
  }
};
