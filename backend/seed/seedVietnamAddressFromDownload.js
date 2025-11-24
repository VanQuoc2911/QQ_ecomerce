/**
 * seedVietnamAddressFromDownload.js
 *
 * Seeder that reads the downloaded Vietnam address data and imports it into MongoDB.
 * Transforms the CDN data format into Province/District/Ward collections.
 *
 * Usage:
 *   npm run seed:vietnam-data
 */

import dotenv from "dotenv";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import District from "../models/District.js";
import Province from "../models/Province.js";
import Ward from "../models/Ward.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";
const DATA_FILE = path.join(
  __dirname,
  "vietnam_address_output",
  "vietnam_full_nested.json"
);

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    if (!fs.existsSync(DATA_FILE)) {
      console.error(`❌ Data file not found: ${DATA_FILE}`);
      console.log("Run: npm run download:vietnam-data first");
      process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    console.log(`📦 Loaded Vietnam address data from ${DATA_FILE}`);

    // Handle the new format: object with province_name as keys
    const provArray =
      typeof rawData === "object" && !Array.isArray(rawData)
        ? Object.entries(rawData).map(([name, value]) => ({
            code: value.code,
            name: name,
            districts: value.districts || [],
          }))
        : rawData;

    console.log(`🔄 Processing ${provArray.length} provinces...`);

    // Collect all bulk operations
    const provinceBulk = Province.collection.initializeUnorderedBulkOp();
    const districtBulk = District.collection.initializeUnorderedBulkOp();
    const wardBulk = Ward.collection.initializeUnorderedBulkOp();

    const provinceMap = {}; // Map province name to _id
    const districtMap = {}; // Map district name to _id

    // Phase 1: Upsert all provinces (bulk)
    for (const provData of provArray) {
      provinceBulk
        .find({ name: provData.name })
        .upsert()
        .updateOne({ $set: { name: provData.name } });
    }

    console.log(`⏳ Upserting provinces...`);
    await provinceBulk.execute();

    // Phase 2: Fetch province map
    const provinces = await Province.find({}, { _id: 1, name: 1 });
    provinces.forEach((p) => {
      provinceMap[p.name] = p._id;
    });
    console.log(`✅ ${provinces.length} provinces ready`);

    // Phase 3: Upsert all districts (bulk)
    console.log(`⏳ Upserting districts...`);
    let districtCount = 0;
    for (const provData of provArray) {
      const provId = provinceMap[provData.name];
      for (const distData of provData.districts || []) {
        districtBulk
          .find({ name: distData.name, province: provId })
          .upsert()
          .updateOne({ $set: { name: distData.name, province: provId } });
        districtCount++;
      }
    }
    if (districtCount > 0) await districtBulk.execute();
    console.log(`✅ ${districtCount} districts ready`);

    // Phase 4: Fetch district map
    const districts = await District.find({}, { _id: 1, name: 1 });
    districts.forEach((d) => {
      districtMap[d.name] = d._id;
    });

    // Phase 5: Upsert all wards (bulk)
    console.log(`⏳ Upserting wards...`);
    let wardCount = 0;
    for (const provData of provArray) {
      for (const distData of provData.districts || []) {
        const distId = districtMap[distData.name];
        for (const wardData of distData.wards || []) {
          wardBulk
            .find({ name: wardData.name, district: distId })
            .upsert()
            .updateOne({ $set: { name: wardData.name, district: distId } });
          wardCount++;
        }
      }
    }
    if (wardCount > 0) await wardBulk.execute();
    console.log(`✅ ${wardCount} wards ready`);

    console.log(`\n📊 Seeding complete:`);
    console.log(`   ✅ Provinces: ${provinces.length}`);
    console.log(`   ✅ Districts: ${districtCount}`);
    console.log(`   ✅ Wards: ${wardCount}\n`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].includes("seedVietnamAddressFromDownload.js")
) {
  seed();
}
