import nodemailer from "nodemailer";
import SystemSetting from "../models/SystemSettings.js";

let transporter = null;
let transporterInitialized = false;
let lastConfig = null;

const createTransporterFromEnv = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!user || !pass) {
    return null;
  }

  lastConfig = {
    fromAddress: process.env.SMTP_FROM || user,
    fromName: process.env.SMTP_FROM_NAME || "",
  };

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const createTransporterFromSettings = async () => {
  try {
    const settings = await SystemSetting.findOne().lean();
    const smtp = settings?.smtp;
    if (!smtp || !smtp.username || !smtp.password) {
      return null;
    }

    const port = Number(smtp.smtpPort || 587);
    const secure =
      typeof smtp.secure === "boolean" ? smtp.secure : port === 465;

    lastConfig = {
      fromAddress: smtp.email || smtp.username,
      fromName: smtp.fromName || "",
    };

    return nodemailer.createTransport({
      host: smtp.smtpServer || "smtp.gmail.com",
      port,
      secure,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
    });
  } catch (err) {
    console.error("[EmailService] Failed to load SMTP settings from DB", err);
    return null;
  }
};

const buildTransporter = async () => {
  const fromEnv = createTransporterFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  const fromDb = await createTransporterFromSettings();
  if (fromDb) {
    return fromDb;
  }

  console.warn(
    "[EmailService] No SMTP credentials configured (env or admin settings)."
  );
  lastConfig = null;
  return null;
};

const getTransporter = async () => {
  if (!transporterInitialized) {
    transporter = await buildTransporter();
    transporterInitialized = true;
  }
  return transporter;
};

export const invalidateEmailTransporter = () => {
  transporter = null;
  transporterInitialized = false;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) throw new Error("sendEmail requires a recipient address");

  const activeTransporter = await getTransporter();

  if (!activeTransporter) {
    console.info("[EmailService] Email not sent (SMTP not configured)", {
      to,
      subject,
    });
    return false;
  }

  let from = process.env.SMTP_FROM;
  if (!from && lastConfig?.fromAddress) {
    from = lastConfig.fromName
      ? `${lastConfig.fromName} <${lastConfig.fromAddress}>`
      : lastConfig.fromAddress;
  }
  if (!from && activeTransporter.options?.auth?.user) {
    from = activeTransporter.options.auth.user;
  }

  try {
    await activeTransporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[EmailService] Failed to send email", err);
    invalidateEmailTransporter();
    throw err;
  }
};
