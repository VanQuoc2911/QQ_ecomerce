import mongoose from "mongoose";
import QRCode from "qrcode";
import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import { getIO } from "../utils/socket.js";

/**
 * Generate banking QR code data for direct bank transfer
 * Generates actual QR code image using qrcode library
 */
export const generateBankingQR = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    // Fetch order with seller bank account
    const order = await Order.findById(orderId).populate("shopId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const { sellerBankAccount, totalAmount } = order;

    if (!sellerBankAccount || !sellerBankAccount.accountNumber) {
      return res.status(400).json({
        message: "Seller bank account information not available",
      });
    }

    const { accountNumber, accountHolder, bankName } = sellerBankAccount;

    // VietQR standard bank codes
    const bankCodes = {
      vietcombank: "970436",
      acb: "970409",
      agribank: "970405",
      mb: "970422",
      techcombank: "970407",
      tpbank: "970423",
      sacombank: "970426",
      vpbank: "970432",
      bidv: "970418",
      ocb: "970448",
      seabank: "970441",
    };

    function getBankCode(name) {
      if (!name) return "970436";
      const lower = name.toLowerCase();
      for (const [key, code] of Object.entries(bankCodes)) {
        if (lower.includes(key)) return code;
      }
      return "970436";
    }

    const bankCodeNorm = getBankCode(bankName);
    const cleanAccountNo = accountNumber.replace(/\s+/g, "");
    const cleanAccountName = (accountHolder || "Shop Owner")
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .trim();

    // Create payment reference
    const paymentRef = `DH${orderId
      .substring(orderId.length - 8)
      .toUpperCase()}`;

    // Build VietQR EMV QRPS format string for Vietnamese banking
    const qrData = buildVietQRString(
      bankCodeNorm,
      cleanAccountNo,
      cleanAccountName,
      totalAmount,
      paymentRef
    );

    console.log("🔍 Banking QR Data:", {
      bankCode: bankCodeNorm,
      accountNumber: cleanAccountNo,
      accountHolder: cleanAccountName,
      amount: totalAmount,
      reference: paymentRef,
    });

    // Generate QR code as data URL (image)
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 300,
    });

    console.log("✅ QR Code generated successfully");

    return res.json({
      success: true,
      qrData: {
        bankCode: bankCodeNorm,
        accountNumber: cleanAccountNo,
        accountHolder: cleanAccountName,
        amount: totalAmount,
        description: `Don hang ${paymentRef}`,
        bankName,
        reference: paymentRef,
        qrString: qrData, // Raw QR string
        qrCodeDataUrl, // QR code as data URL (image)
      },
    });
  } catch (err) {
    console.error("Error generating banking QR:", err);
    res.status(500).json({ message: "Error generating banking QR code" });
  }
};

/**
 * Calculate CRC16-CCITT checksum for VietQR EMV format
 */
function calculateCRC(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= byte << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc = crc & 0xffff;
    }
  }
  return (crc ^ 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Build VietQR EMV QRPS format string
 * Proper format with CRC checksum for Vietnamese banking apps
 */
function buildVietQRString(
  bankCode,
  accountNo,
  accountName,
  amount,
  reference
) {
  // Build VietQR EMV QRPS format
  // Reference: https://www.vietqr.io/

  // Template: 00020126...
  let qrString = "00020126";

  // Merchant account info - VietQR merchant
  qrString += "360012vn.com.vietqr0111";
  qrString += bankCode;
  qrString += accountNo;

  // Currency (VND = 704), transaction amount, etc
  qrString += "5204000053037045";

  // Amount (13 digits, zero-padded)
  const amountStr = String(amount).padStart(13, "0");
  qrString += "40" + amountStr;

  // Country code VN
  qrString += "5802VN";

  // Merchant name and reference
  qrString += "62";
  const merchantRef = `${accountName.substring(0, 20)}|${reference}`;
  qrString += String(merchantRef.length).padStart(2, "0");
  qrString += merchantRef;

  // CRC field placeholder
  qrString += "6304";

  // Calculate CRC
  const crc = calculateCRC(qrString);
  qrString += crc;

  console.log("📱 VietQR EMV String:", qrString);
  return qrString;
}

/**
 * Get order details for QR payment page
 */
export const getQRPaymentInfo = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await Order.findById(orderId).populate(
      "shopId",
      "bankAccount"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({
      success: true,
      order: {
        _id: order._id,
        totalAmount: order.totalAmount,
        orderInfo: `Thanh toán đơn hàng ${order._id}`,
        sellerBankAccount: order.sellerBankAccount,
        createdAt: order.createdAt,
        paymentDeadline: order.paymentDeadline,
      },
    });
  } catch (err) {
    console.error("Error fetching QR payment info:", err);
    res.status(500).json({ message: "Error fetching payment information" });
  }
};

export const handleBankingPaymentResult = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, transactionId, amount, note } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const normalizedStatus = String(status || "").toLowerCase();
    if (
      !normalizedStatus ||
      !["success", "failed"].includes(normalizedStatus)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid status. Must be 'success' or 'failed'" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const userId = req.user?.id;
    if (!userId || order.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không thể cập nhật đơn hàng này" });
    }

    if (order.paymentMethod !== "banking") {
      return res
        .status(400)
        .json({ message: "Đơn hàng này không sử dụng phương thức ngân hàng" });
    }

    if (
      normalizedStatus === "success" &&
      ["processing", "completed"].includes(order.status)
    ) {
      return res.json({
        success: true,
        message: "Đơn hàng đã được xác nhận trước đó.",
        order,
      });
    }

    if (normalizedStatus === "success") {
      order.status = "processing";
      order.paymentExpired = false;
      order.paymentDeadline = null;
      order.paymentInfo = {
        ...(order.paymentInfo || {}),
        transactionNo: transactionId || order.paymentInfo?.transactionNo,
        responseCode: "BANKING_SUCCESS",
        raw: {
          ...(order.paymentInfo?.raw || {}),
          bankingResult: {
            ...(order.paymentInfo?.raw?.bankingResult || {}),
            lastStatus: "success",
            amount: amount ?? order.totalAmount,
            note,
            handledAt: new Date().toISOString(),
          },
        },
      };
      await order.save();

      try {
        const buyerNotification = new Notification({
          userId: order.userId,
          title: "Thanh toán thành công",
          message: `Đơn hàng ${order._id} đã được xác nhận thanh toán. Seller sẽ xử lý trong giây lát.`,
          type: "payment",
          read: false,
          refId: order._id,
          url: `/Order/${order._id}`,
        });
        const sellerNotification = new Notification({
          userId: order.sellerId,
          title: "Khách hàng đã thanh toán",
          message: `Đơn hàng ${order._id} đã thanh toán thành công bằng chuyển khoản ngân hàng.`,
          type: "payment",
          read: false,
          refId: order._id,
          url: `/Order/${order._id}`,
        });
        await buyerNotification.save();
        await sellerNotification.save();
      } catch (notifErr) {
        console.error(
          "handleBankingPaymentResult notification error:",
          notifErr
        );
      }

      try {
        const io = getIO();
        if (io) {
          const payload = {
            orderId: order._id,
            status: "processing",
            message: "Thanh toán ngân hàng đã được xác nhận",
          };
          io.to(order.userId.toString()).emit(
            "order:paymentConfirmed",
            payload
          );
          io.to(order.sellerId.toString()).emit(
            "order:paymentConfirmed",
            payload
          );
        }
      } catch (socketErr) {
        console.error("handleBankingPaymentResult socket error:", socketErr);
      }

      return res.json({
        success: true,
        message: "Thanh toán ngân hàng đã được xác nhận.",
        order,
      });
    }

    const retryMinutes = Number(process.env.BANKING_RETRY_MINUTES || 15);
    const countdownMs = retryMinutes * 60 * 1000;
    const newDeadline = new Date(Date.now() + countdownMs);
    order.status = "pending";
    order.paymentExpired = false;
    order.paymentDeadline = newDeadline;
    order.paymentInfo = {
      ...(order.paymentInfo || {}),
      responseCode: "BANKING_FAILED",
      raw: {
        ...(order.paymentInfo?.raw || {}),
        bankingResult: {
          ...(order.paymentInfo?.raw?.bankingResult || {}),
          lastStatus: "failed",
          attemptedAt: new Date().toISOString(),
          amount,
          note,
        },
      },
    };
    await order.save();

    return res.json({
      success: false,
      message:
        "Thanh toán chưa hoàn tất. Vui lòng chuyển khoản lại trong thời gian cho phép.",
      order,
      countdownMs,
      deadline: newDeadline.toISOString(),
    });
  } catch (err) {
    console.error("handleBankingPaymentResult error:", err);
    res.status(500).json({
      message:
        "Không thể cập nhật trạng thái thanh toán ngân hàng. Vui lòng thử lại.",
    });
  }
};
