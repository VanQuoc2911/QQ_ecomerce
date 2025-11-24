import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import { getNextId } from "../utils/getNextId.js";

dotenv.config();

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error("MONGO_URI not set in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const [email, password, name = "Demo Shipper", phone = "0900000000"] = args;

if (!email || !password) {
  console.error(
    "Usage: node scripts/createShipperUser.js <email> <password> [name] [phone]"
  );
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ Connected to MongoDB");

    const hashed = await bcrypt.hash(password, 10);
    let user = await User.findOne({ email });

    if (user) {
      console.log(`Updating existing user ${email} to shipper role...`);
      user.name = name;
      user.password = hashed;
      user.role = "shipper";
      user.shipperApproved = true;
      user.phone = phone;
      await user.save();
    } else {
      const id = await getNextId(User);
      user = await User.create({
        id,
        name,
        email,
        password: hashed,
        phone,
        role: "shipper",
        shipperApproved: true,
      });
      console.log(`Created new shipper user ${email}`);
    }

    console.log("Login credentials:");
    console.log("Email:", email);
    console.log("Password:", password);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create shipper user", error);
    process.exit(1);
  }
};

run();
