import dotenv from "dotenv";
import mongoose from "mongoose";
import Shop from "../models/Shop.js";

dotenv.config();

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error("MONGO_URI not set in .env");
  process.exit(1);
}

const shopId = process.argv[2];
if (!shopId) {
  console.error("Usage: node setShopBank.js <shopId>");
  process.exit(1);
}

const bank = {
  bankName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)",
  accountNumber: "01234567890123",
  accountHolder: "Cửa hàng Cat Shop",
  branch: "Chi nhánh Thủ Dầu Một",
};

const run = async () => {
  try {
    await mongoose.connect(MONGO);
    console.log("Connected to MongoDB");
    const shop = await Shop.findById(shopId);
    if (!shop) {
      console.error("Shop not found", shopId);
      process.exit(1);
    }
    shop.bankAccount = bank;
    await shop.save();
    console.log("Shop bank updated:", shopId);
    console.log(shop.bankAccount);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
