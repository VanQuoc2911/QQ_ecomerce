import express from "express";
import District from "../models/District.js";
import Province from "../models/Province.js";
import Ward from "../models/Ward.js";

const router = express.Router();

// Helpers
const removeDiacritics = (str = "") =>
  String(str)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const similarity = (a = "", b = "") => {
  a = removeDiacritics(a || "");
  b = removeDiacritics(b || "");
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 95;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return Math.round((i / Math.max(a.length, b.length)) * 100);
};

const fetchWithTimeout = async (
  url,
  options = {},
  retries = 2,
  timeout = 5000
) => {
  const attempt = async (n, delay) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const resp = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return resp;
    } catch (err) {
      clearTimeout(id);
      if (n > 0) {
        await new Promise((r) => setTimeout(r, delay));
        return attempt(n - 1, Math.min(delay * 1.5, 2000));
      }
      throw err;
    }
  };
  return attempt(retries, 300);
};

// Routes
router.get("/provinces", async (req, res) => {
  try {
    const provinces = await Province.find({}, { name: 1 }).sort({ name: 1 });
    res.json(provinces.map((p) => p.name));
  } catch (err) {
    console.error("getProvinces error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/districts/:province", async (req, res) => {
  try {
    const { province } = req.params;
    const prov = await Province.findOne({ name: province });
    if (!prov) return res.json([]);
    const districts = await District.find(
      { province: prov._id },
      { name: 1 }
    ).sort({ name: 1 });
    res.json(districts.map((d) => d.name));
  } catch (err) {
    console.error("getDistricts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/wards/:province/:district", async (req, res) => {
  try {
    const { province, district } = req.params;
    const prov = await Province.findOne({ name: province });
    if (!prov) return res.json([]);
    const dist = await District.findOne({ name: district, province: prov._id });
    if (!dist) return res.json([]);
    const wards = await Ward.find({ district: dist._id }, { name: 1 }).sort({
      name: 1,
    });
    res.json(wards.map((w) => w.name));
  } catch (err) {
    console.error("getWards error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng)
      return res.status(400).json({ message: "lat and lng are required" });
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum))
      return res
        .status(400)
        .json({ message: "lat and lng must be valid numbers" });

    const ua = { headers: { "User-Agent": "QQ-Ecommerce-App/1.0" } };

    // Primary: Nominatim
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        String(latNum)
      )}&lon=${encodeURIComponent(
        String(lngNum)
      )}&addressdetails=1&accept-language=vi`;
      const r = await fetchWithTimeout(url, ua, 3, 5000);
      if (r && r.ok) {
        const data = await r.json();
        const addr = data.address || {};
        let province = addr.state || addr.region || addr.province || "";
        let district =
          addr.county || addr.district || addr.city_district || addr.city || "";
        const ward =
          addr.suburb || addr.village || addr.town || addr.neighbourhood || "";

        // Try to match with DB to get old names (before merger)
        let oldProvince = "",
          oldDistrict = "";
        if (province) {
          const prov = await Province.findOne({
            name: { $regex: province, $options: "i" },
          });
          if (prov) {
            oldProvince = prov.oldName || prov.name;
            if (district) {
              const dist = await District.findOne({
                province: prov._id,
                name: { $regex: district, $options: "i" },
              });
              if (dist) {
                oldDistrict = dist.oldName || dist.name;
              }
            }
          }
        }

        return res.json({
          province,
          district,
          ward,
          oldProvince: oldProvince || province,
          oldDistrict: oldDistrict || district,
          detail: data.display_name || "",
          raw: data,
          source: "nominatim",
        });
      }
    } catch (e) {
      console.warn("Nominatim failed:", e && e.message ? e.message : e);
    }

    // Fallback: geocode.maps.co (if key present)
    try {
      const mapsKey = process.env.GEOCODE_MAPS_CO_KEY;
      if (mapsKey) {
        const url = `https://geocode.maps.co/reverse?lat=${encodeURIComponent(
          String(latNum)
        )}&lon=${encodeURIComponent(String(lngNum))}&accept-language=vi`;
        const r2 = await fetchWithTimeout(url, ua, 2, 5000);
        if (r2 && r2.ok) {
          const d2 = await r2.json();
          const addr = d2.address || {};
          let province =
            addr.state || addr.region || addr.province || addr.county || "";
          let district =
            addr.county ||
            addr.district ||
            addr.city_district ||
            addr.city ||
            "";
          const ward =
            addr.suburb ||
            addr.village ||
            addr.town ||
            addr.neighbourhood ||
            "";

          // Try to match with DB to get old names (before merger)
          let oldProvince = "",
            oldDistrict = "";
          if (province) {
            const prov = await Province.findOne({
              name: { $regex: province, $options: "i" },
            });
            if (prov) {
              oldProvince = prov.oldName || prov.name;
              if (district) {
                const dist = await District.findOne({
                  province: prov._id,
                  name: { $regex: district, $options: "i" },
                });
                if (dist) {
                  oldDistrict = dist.oldName || dist.name;
                }
              }
            }
          }

          return res.json({
            province,
            district,
            ward,
            oldProvince: oldProvince || province,
            oldDistrict: oldDistrict || district,
            detail: d2.display_name || "",
            raw: d2,
            source: "geocode.maps.co",
          });
        }
      }
    } catch (e) {
      console.warn("geocode.maps.co failed:", e && e.message ? e.message : e);
    }

    // Final fallback: coordinate-only
    return res.json({
      province: "",
      district: "",
      ward: "",
      detail: `Vị trí: ${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`,
      raw: { lat: latNum, lng: lngNum },
      source: "coordinate-only",
    });
  } catch (err) {
    console.error("/reverse error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/match-location", async (req, res) => {
  try {
    const { province: p, district: d, ward: w } = req.body || {};
    const out = { province: "", district: "", ward: "", confidence: 0 };

    if (p) {
      const provinces = await Province.find({}, { name: 1 });
      let best = "";
      let bestScore = 0;
      for (const prov of provinces) {
        const s = similarity(p, prov.name);
        if (s > bestScore) {
          bestScore = s;
          best = prov.name;
        }
        if (bestScore > 90) break;
      }
      if (bestScore > 50) out.province = best;
    }

    if (d && out.province) {
      const provDoc = await Province.findOne({ name: out.province });
      if (provDoc) {
        const districts = await District.find(
          { province: provDoc._id },
          { name: 1 }
        );
        let best = "";
        let bestScore = 0;
        for (const dist of districts) {
          const s = similarity(d, dist.name);
          if (s > bestScore) {
            bestScore = s;
            best = dist.name;
          }
        }
        if (bestScore > 50) out.district = best;
      }
    }

    if (w && out.district && out.province) {
      const provDoc = await Province.findOne({ name: out.province });
      const distDoc = await District.findOne({
        name: out.district,
        province: provDoc._id,
      });
      if (distDoc) {
        const wards = await Ward.find({ district: distDoc._id }, { name: 1 });
        let best = "";
        let bestScore = 0;
        for (const wd of wards) {
          const s = similarity(w, wd.name);
          if (s > bestScore) {
            bestScore = s;
            best = wd.name;
          }
        }
        if (bestScore > 50) out.ward = best;
      }
    }

    let conf = 0;
    if (out.province) conf += 0.33;
    if (out.district) conf += 0.33;
    if (out.ward) conf += 0.34;
    out.confidence = conf;

    res.json(out);
  } catch (err) {
    console.error("match-location error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
