import dotenv from "dotenv";
import mongoose from "mongoose";
import Address from "../models/Address.js";
import District from "../models/District.js";
import Province from "../models/Province.js";
import Ward from "../models/Ward.js";

dotenv.config();

const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";

async function migrate() {
  try {
    await mongoose.connect(MONGO);
    console.log("🔄 Connected to MongoDB for migration...");

    const addresses = await Address.find({}).lean();
    console.log(`Found ${addresses.length} address documents to migrate`);

    let provinces = 0;
    let districts = 0;
    let wards = 0;

    for (const addr of addresses) {
      const provinceName = addr.province;
      if (!provinceName) continue;

      // Upsert province
      const provDoc = await Province.findOneAndUpdate(
        { name: provinceName },
        { $set: { name: provinceName } },
        { upsert: true, new: true }
      );
      if (provDoc) provinces++;

      if (!Array.isArray(addr.districts)) continue;

      for (const d of addr.districts) {
        const districtName = d.name;
        if (!districtName) continue;

        const distDoc = await District.findOneAndUpdate(
          { name: districtName, province: provDoc._id },
          { $set: { name: districtName, province: provDoc._id } },
          { upsert: true, new: true }
        );
        if (distDoc) districts++;

        if (!Array.isArray(d.wards)) continue;

        for (const w of d.wards) {
          const wardName = w.name;
          if (!wardName) continue;

          const wardDoc = await Ward.findOneAndUpdate(
            { name: wardName, district: distDoc._id },
            { $set: { name: wardName, district: distDoc._id } },
            { upsert: true, new: true }
          );
          if (wardDoc) wards++;
        }
      }
    }

    console.log(
      `✅ Migration complete. Provinces: ${provinces}, Districts: ${districts}, Wards: ${wards}`
    );
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].includes("migrateAddressToNormalized.js")
) {
  migrate();
}
