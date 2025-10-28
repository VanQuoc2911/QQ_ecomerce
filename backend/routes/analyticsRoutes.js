import express from "express";
import Analytics from "../models/Analytics.js";
import { getNextId } from "../utils/getNextId.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const analytics = await Analytics.find().sort({ date: -1 });
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const p = req.params.id;
    const item = isNaN(p)
      ? await Analytics.findById(p)
      : await Analytics.findOne({ id: Number(p) });
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body;
    payload.id = payload.id || (await getNextId(Analytics));
    const created = await Analytics.create(payload);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const p = req.params.id;
    const filter = isNaN(p) ? { _id: p } : { id: Number(p) };
    const updated = await Analytics.findOneAndUpdate(filter, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const p = req.params.id;
    const filter = isNaN(p) ? { _id: p } : { id: Number(p) };
    const removed = await Analytics.findOneAndDelete(filter);
    if (!removed) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
