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

    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleKey) {
      return res
        .status(500)
        .json({ message: "Google Maps API key is not configured" });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
      String(latNum)
    )},${encodeURIComponent(String(lngNum))}&key=${googleKey}&language=vi`;
    const r = await fetchWithTimeout(url, {}, 2, 6000);
    if (r && r.ok) {
      const data = await r.json();
      if (
        data.status === "OK" &&
        Array.isArray(data.results) &&
        data.results[0]
      ) {
        const comp = data.results[0].address_components || [];
        const findComponent = (type) => {
          const c = comp.find((item) =>
            Array.isArray(item.types) ? item.types.includes(type) : false
          );
          return c ? c.long_name || c.short_name || "" : "";
        };

        const province =
          findComponent("administrative_area_level_1") ||
          findComponent("administrative_area_level_2") ||
          findComponent("locality") ||
          "";
        const district =
          findComponent("administrative_area_level_2") ||
          findComponent("administrative_area_level_3") ||
          findComponent("locality") ||
          findComponent("sublocality") ||
          "";
        const ward =
          findComponent("administrative_area_level_3") ||
          findComponent("administrative_area_level_4") ||
          findComponent("sublocality") ||
          findComponent("neighborhood") ||
          "";

        let oldProvince = "";
        let oldDistrict = "";
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
          detail: data.results[0].formatted_address || "",
          raw: data.results[0],
          source: "google-maps",
        });
      }
      console.warn("Google geocode unexpected response", data);
    }

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
