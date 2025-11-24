/**
 * migrateOldNames.js
 *
 * Populate oldName fields for Province and District models
 * with historical names before the 2024 administrative consolidation.
 *
 * Vietnam 2024 mergers:
 * - Hà Giang merged from multiple districts
 * - Cao Bằng merged from multiple districts
 * - Bạc Liêu and Ca Mau underwent changes
 * - etc.
 *
 * Usage: node seed/migrateOldNames.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import District from "../models/District.js";
import Province from "../models/Province.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";

// Map of current province names to their old names (before 2024 merger)
const provinceOldNames = {
  "Hà Giang": "Hà Giang",
  "Cao Bằng": "Cao Bằng",
  "Bạc Liêu": "Bạc Liêu",
  "Cà Mau": "Cà Mau",
  "Hồ Chí Minh": "Thành phố Hồ Chí Minh",
  "Hà Nội": "Thành phố Hà Nội",
  // Add more mappings as needed - this is a template
};

// Map of current district names to their old names
const districtOldNames = {
  // Format: "provinceName|districtName": "oldDistrictName"
  // Example: "Hà Giang|Vị Xuyên": "Vị Xuyên (cũ)"
};

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    let provinceUpdates = 0;
    let districtUpdates = 0;

    // Update provinces with old names
    for (const [currentName, oldName] of Object.entries(provinceOldNames)) {
      const result = await Province.updateOne(
        { name: currentName },
        { $set: { oldName: oldName } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✓ Province: ${currentName} → oldName: ${oldName}`);
        provinceUpdates++;
      }
    }

    // Update districts with old names
    for (const [key, oldName] of Object.entries(districtOldNames)) {
      const [provinceName, districtName] = key.split("|");
      const province = await Province.findOne({ name: provinceName });
      if (province) {
        const result = await District.updateOne(
          { province: province._id, name: districtName },
          { $set: { oldName: oldName } }
        );
        if (result.modifiedCount > 0) {
          console.log(
            `✓ District: ${provinceName}/${districtName} → oldName: ${oldName}`
          );
          districtUpdates++;
        }
      }
    }

    console.log(
      `\n📊 Migration summary:\n  Provinces updated: ${provinceUpdates}\n  Districts updated: ${districtUpdates}`
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
