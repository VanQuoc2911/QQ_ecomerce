/**
 * download_vietnam_data.js
 *
 * Node.js script to download Vietnam address data from the official open API
 * and combine into local files for seeding MongoDB.
 *
 * Usage:
 *   node seed/download_vietnam_data.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVINCES_API = "https://provinces.open-api.vn/api/p/";
const DISTRICTS_API = "https://provinces.open-api.vn/api/d/";
const WARDS_API = "https://provinces.open-api.vn/api/w/";
const OUT_DIR = path.join(__dirname, "vietnam_address_output");

async function download() {
  try {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`🔄 Downloading Vietnam data from official API...`);

    // Fetch all provinces
    console.log(`📥 Fetching provinces...`);
    const provRes = await fetch(PROVINCES_API);
    if (!provRes.ok) throw new Error(`Provinces API failed: ${provRes.status}`);
    const provinces = await provRes.json();

    // Fetch all districts
    console.log(`📥 Fetching districts...`);
    const distRes = await fetch(DISTRICTS_API);
    if (!distRes.ok) throw new Error(`Districts API failed: ${distRes.status}`);
    const districts = await distRes.json();

    // Fetch all wards
    console.log(`📥 Fetching wards...`);
    const wardRes = await fetch(WARDS_API);
    if (!wardRes.ok) throw new Error(`Wards API failed: ${wardRes.status}`);
    const wards = await wardRes.json();

    // Combine into nested structure
    const combined = {};
    for (const prov of provinces) {
      combined[prov.name] = {
        code: prov.code,
        name: prov.name,
        districts: districts
          .filter((d) => d.province_code === prov.code)
          .map((d) => ({
            code: d.code,
            name: d.name,
            wards: wards
              .filter((w) => w.district_code === d.code)
              .map((w) => ({ code: w.code, name: w.name })),
          })),
      };
    }

    const jsonPath = path.join(OUT_DIR, "vietnam_full_nested.json");
    fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2), "utf-8");
    console.log(`✅ Saved combined dataset -> ${jsonPath}`);

    // Create JS module
    const jsModule = `// vietnam_address.js - auto-generated from official API\nexport default ${JSON.stringify(
      combined,
      null,
      2
    )};\n`;
    const jsPath = path.join(OUT_DIR, "vietnam_address.js");
    fs.writeFileSync(jsPath, jsModule, "utf-8");
    console.log(`✅ Saved JS module -> ${jsPath}`);

    console.log(`\n✅ Download complete!`);
    console.log(`   Provinces: ${provinces.length}`);
    console.log(`   Districts: ${districts.length}`);
    console.log(`   Wards: ${wards.length}\n`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

download();
