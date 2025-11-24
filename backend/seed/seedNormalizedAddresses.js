import dotenv from "dotenv";
import mongoose from "mongoose";
import District from "../models/District.js";
import Province from "../models/Province.js";
import Ward from "../models/Ward.js";
import { VIETNAM_FULL_ADDRESS_DATA } from "./vietnamFullAddressData.js";

dotenv.config();

const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";

async function seed() {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ Connected to MongoDB for normalized seeding...");

    let provincesUpserted = 0;
    let districtsUpserted = 0;
    let wardsUpserted = 0;

    for (const prov of VIETNAM_FULL_ADDRESS_DATA) {
      const provinceName = prov.province;

      // Upsert province
      const provinceDoc = await Province.findOneAndUpdate(
        { name: provinceName },
        { $set: { name: provinceName } },
        { upsert: true, new: true }
      );
      if (provinceDoc) provincesUpserted++;

      if (!Array.isArray(prov.districts)) continue;

      for (const d of prov.districts) {
        const districtName = d.name;

        // Upsert district with reference to province
        const districtDoc = await District.findOneAndUpdate(
          { name: districtName, province: provinceDoc._id },
          { $set: { name: districtName, province: provinceDoc._id } },
          { upsert: true, new: true }
        );
        if (districtDoc) districtsUpserted++;

        if (!Array.isArray(d.wards)) continue;

        for (const w of d.wards) {
          const wardName = w.name;

          // Upsert ward with reference to district
          const wardDoc = await Ward.findOneAndUpdate(
            { name: wardName, district: districtDoc._id },
            { $set: { name: wardName, district: districtDoc._id } },
            { upsert: true, new: true }
          );
          if (wardDoc) wardsUpserted++;
        }
      }
    }

    console.log(
      `✅ Normalized seeding complete. Provinces: ${provincesUpserted}, Districts: ${districtsUpserted}, Wards: ${wardsUpserted}`
    );
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("❌ Normalized seeding failed:", err);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].includes("seedNormalizedAddresses.js")
) {
  seed();
}
