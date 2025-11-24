/**
 * seedVietnamAddressWithOldNames.js
 *
 * Enhanced seeder that imports Vietnam address data and populates both current
 * and historical (pre-2024 merger) names into MongoDB.
 *
 * Usage:
 *   npm run seed:vietnam-data-with-old-names
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

// Vietnam 2024 administrative consolidation mapping
// Current Province Name -> Old Province Names (before merger)
const PROVINCE_OLD_NAMES = {
  "Thành phố Hà Nội": null, // No change
  "Thành phố Hồ Chí Minh": null, // No change
  "Hà Giang": "Hà Giang",
  "Cao Bằng": "Cao Bằng",
  "Bạc Liêu": "Bạc Liêu",
  "Cà Mau": "Cà Mau",
  // Add more mappings here for provinces affected by 2024 merger
};

// District Old Names mapping
// Format: "Province|District" -> "Old District Name"
const DISTRICT_OLD_NAMES = {
  // Examples:
  // "Hà Giang|Vị Xuyên": "Vị Xuyên (cũ)",
  // "Cao Bằng|Hà Quảng": "Hà Quảng (cũ)",
};

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

    // Clear existing data or update with new data
    await Province.deleteMany({});
    await District.deleteMany({});
    await Ward.deleteMany({});
    console.log("🗑️ Cleared existing data");

    const provinceMap = {}; // Map province name to _id
    const districtMap = {}; // Map district name to _id

    // Phase 1: Create all provinces with oldName
    console.log(`⏳ Creating provinces with historical names...`);
    for (const provData of provArray) {
      const oldName = PROVINCE_OLD_NAMES[provData.name] || null;
      const prov = await Province.create({
        name: provData.name,
        oldName: oldName,
      });
      provinceMap[provData.name] = prov._id;
    }
    console.log(`✅ ${provArray.length} provinces created`);

    // Phase 2: Create all districts with oldName
    console.log(`⏳ Creating districts with historical names...`);
    let districtCount = 0;
    for (const provData of provArray) {
      const provId = provinceMap[provData.name];
      for (const distData of provData.districts || []) {
        const key = `${provData.name}|${distData.name}`;
        const oldName = DISTRICT_OLD_NAMES[key] || null;
        const dist = await District.create({
          name: distData.name,
          oldName: oldName,
          province: provId,
        });
        districtMap[distData.name] = dist._id;
        districtCount++;
      }
    }
    console.log(`✅ ${districtCount} districts created`);

    // Phase 3: Create all wards
    console.log(`⏳ Creating wards...`);
    let wardCount = 0;
    for (const provData of provArray) {
      for (const distData of provData.districts || []) {
        const distId = districtMap[distData.name];
        for (const wardData of distData.wards || []) {
          await Ward.create({
            name: wardData.name,
            district: distId,
          });
          wardCount++;
        }
      }
    }
    console.log(`✅ ${wardCount} wards created`);

    console.log(`\n📊 Seeding complete:`);
    console.log(`   ✅ Provinces: ${provArray.length}`);
    console.log(`   ✅ Districts: ${districtCount}`);
    console.log(`   ✅ Wards: ${wardCount}\n`);

    // Summary of populated old names
    const provsWithOldNames = await Province.countDocuments({
      oldName: { $ne: null },
    });
    const distsWithOldNames = await District.countDocuments({
      oldName: { $ne: null },
    });
    console.log(`📝 Historical names populated:`);
    console.log(`   Provinces with oldName: ${provsWithOldNames}`);
    console.log(`   Districts with oldName: ${distsWithOldNames}\n`);

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
  process.argv[1].includes("seedVietnamAddressWithOldNames.js")
) {
  seed();
}

export default seed;
