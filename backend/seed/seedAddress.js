import dotenv from "dotenv";
import mongoose from "mongoose";
import Address from "../models/Address.js";
import { VIETNAM_FULL_ADDRESS_DATA } from "./vietnamFullAddressData.js";

// Load environment variables
dotenv.config();

// Seed function
export const seedAddressData = async () => {
  try {
    // Upsert each province so the script can be re-run to update data
    let updated = 0;
    for (const prov of VIETNAM_FULL_ADDRESS_DATA) {
      const { province, districts } = prov;
      const res = await Address.findOneAndUpdate(
        { province },
        { $set: { districts, province } },
        { upsert: true, new: true }
      );
      if (res) updated++;
    }

    console.log(
      `✅ Upserted ${updated} provinces with districts and wards into MongoDB`
    );
  } catch (err) {
    console.error("❌ Error seeding address data:", err);
    throw err;
  }
};

// Run seed immediately if this file is executed directly
const isMainModule =
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1].includes("seedAddress.js");

if (isMainModule) {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce"
    );
    console.log("✅ Connected to MongoDB");
    await seedAddressData();
    await mongoose.disconnect();
    console.log("✅ Seeding complete!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}
