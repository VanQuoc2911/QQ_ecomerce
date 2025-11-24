import { PayOS } from "@payos/node";
import dotenv from "dotenv";
dotenv.config();

let payosInstance = null;
const REQUIRED_ENV_VARS = [
  "PAYOS_CLIENT_ID",
  "PAYOS_API_KEY",
  "PAYOS_CHECKSUM_KEY",
];

export const ensurePayOSConfig = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `PayOS environment variables missing: ${missing.join(", ")}`
    );
  }
};

export const getPayOSClient = () => {
  ensurePayOSConfig();
  if (!payosInstance) {
    payosInstance = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }
  return payosInstance;
};

const withOrderId = (template, orderId) => {
  if (!template) return template;
  return template.includes(":orderId")
    ? template.replace(/:orderId/gi, orderId)
    : template;
};

export const buildPayOSRedirectUrls = (orderId) => {
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const defaultReturn = `${clientOrigin}/checkout-success/${orderId}?method=payos`;
  const defaultCancel = `${clientOrigin}/orders/${orderId}?payment=payos&status=cancelled`;

  const configuredReturn = withOrderId(process.env.PAYOS_RETURN_URL, orderId);
  const configuredCancel = withOrderId(process.env.PAYOS_CANCEL_URL, orderId);

  return {
    returnUrl: configuredReturn || defaultReturn,
    cancelUrl: configuredCancel || defaultCancel,
  };
};
