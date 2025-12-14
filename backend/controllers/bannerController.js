import { Readable } from "stream";
import Banner from "../models/Banner.js";
import cloudinary from "../utils/cloudinary.js";
import { getIO } from "../utils/socket.js";
import { sendAIMessage } from "./aiChatController.js";

const safeParseJson = (text) => {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const raw = text.slice(start, end + 1);
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const generateImageIfConfigured = async (imagePrompt) => {
  try {
    const IMAGE_API_URL = process.env.IMAGE_GEN_URL;
    const IMAGE_API_KEY = process.env.IMAGE_GEN_KEY;
    if (!IMAGE_API_URL || !IMAGE_API_KEY)
      return { imageUrl: null, note: "no-image-api" };
    const initialResp = await fetch(IMAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${IMAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: imagePrompt }),
    });
    if (!initialResp.ok) return { imageUrl: null, note: "image-api-failed" };
    const initialJson = await initialResp.json();
    console.log(
      "generateImageIfConfigured: provider response shape:",
      typeof initialJson,
      initialJson && (initialJson.data || initialJson.url)
        ? initialJson.data || initialJson.url
        : initialJson
    );

    // accept either { url } or { data: { url } } or base64 in data
    // Try common shapes: OpenAI returns data[0].b64_json or data[0].url
    let url = null;
    if (
      initialJson?.data &&
      Array.isArray(initialJson.data) &&
      initialJson.data.length > 0
    ) {
      const first = initialJson.data[0];
      if (first.url) url = first.url;
      // OpenAI may return base64 in b64_json
      if (!url && first.b64_json) {
        // upload base64 to Cloudinary
        try {
          const buffer = Buffer.from(first.b64_json, "base64");
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: process.env.CLOUDINARY_FOLDER || "banners" },
              (err, res) => {
                if (err) return reject(err);
                resolve(res);
              }
            );
            Readable.from(buffer).pipe(stream);
          });
          url = result.secure_url || result.url || null;
          console.log(
            "generateImageIfConfigured: uploaded b64_json to cloudinary",
            { url }
          );
        } catch (uploadErr) {
          console.warn(
            "cloudinary upload failed",
            uploadErr?.message || uploadErr
          );
        }
      }
    }

    const provider = (process.env.IMAGE_GEN_PROVIDER || "").toLowerCase();
    // OpenAI-specific flow (recommended)
    if (provider === "openai") {
      const openaiUrl =
        IMAGE_API_URL || "https://api.openai.com/v1/images/generations";
      console.log("generateImageIfConfigured: calling OpenAI Images API", {
        openaiUrl,
      });
      const resp = await fetch(openaiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${IMAGE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: imagePrompt, n: 1, size: "1024x512" }),
      });
      if (!resp.ok) {
        console.warn("OpenAI image API returned non-OK", resp.status);
        return {
          imageUrl: null,
          note: "image-api-failed",
          status: resp.status,
        };
      }
      const j = await resp.json();
      console.log(
        "generateImageIfConfigured: openai response keys:",
        Object.keys(j || {})
      );
      url = null;
      // OpenAI may return base64 in data[0].b64_json or a url in data[0].url
      if (j?.data && Array.isArray(j.data) && j.data.length > 0) {
        const first = j.data[0];
        if (first.url) url = first.url;
        if (!url && first.b64_json) {
          try {
            const buffer = Buffer.from(first.b64_json, "base64");
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: process.env.CLOUDINARY_FOLDER || "banners" },
                (err, res) => {
                  if (err) return reject(err);
                  resolve(res);
                }
              );
              Readable.from(buffer).pipe(stream);
            });
            url = result.secure_url || result.url || null;
            console.log(
              "generateImageIfConfigured: uploaded b64_json to cloudinary",
              { url }
            );
          } catch (uploadErr) {
            console.warn(
              "cloudinary upload failed",
              uploadErr?.message || uploadErr
            );
          }
        }
      }
      // fallback: maybe OpenAI returns a direct data URL
      if (!url && typeof j === "string" && j.startsWith("data:image/")) {
        try {
          const parts = j.split(",");
          const b64 = parts[1];
          const buffer = Buffer.from(b64, "base64");
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: process.env.CLOUDINARY_FOLDER || "banners" },
              (err, res) => {
                if (err) return reject(err);
                resolve(res);
              }
            );
            Readable.from(buffer).pipe(stream);
          });
          url = result.secure_url || result.url || null;
          console.log(
            "generateImageIfConfigured: uploaded dataURL to cloudinary",
            { url }
          );
        } catch (uploadErr) {
          console.warn(
            "cloudinary upload failed (data URL)",
            uploadErr?.message || uploadErr
          );
        }
      }
      return { imageUrl: url, raw: j };
    }

    // Generic provider flow (previous behavior)
    console.log("generateImageIfConfigured: calling generic image API", {
      IMAGE_API_URL,
    });
    const resp = await fetch(IMAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${IMAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: imagePrompt }),
    });
    if (!resp.ok) return { imageUrl: null, note: "image-api-failed" };
    const providerJson = await resp.json();
    console.log(
      "generateImageIfConfigured: provider response shape:",
      typeof providerJson,
      providerJson && (providerJson.data || providerJson.url)
        ? providerJson.data || providerJson.url
        : providerJson
    );
    // accept either { url } or { data: { url } } or base64 in data
    // Try common shapes: provider returns data[0].b64_json or data[0].url
    url = null;
    if (
      providerJson?.data &&
      Array.isArray(providerJson.data) &&
      providerJson.data.length > 0
    ) {
      const first = providerJson.data[0];
      if (first.url) url = first.url;
      if (!url && first.b64_json) {
        try {
          const buffer = Buffer.from(first.b64_json, "base64");
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: process.env.CLOUDINARY_FOLDER || "banners" },
              (err, res) => {
                if (err) return reject(err);
                resolve(res);
              }
            );
            Readable.from(buffer).pipe(stream);
          });
          url = result.secure_url || result.url || null;
          console.log(
            "generateImageIfConfigured: uploaded base64 to cloudinary",
            { url }
          );
        } catch (uploadErr) {
          console.warn(
            "cloudinary upload failed",
            uploadErr?.message || uploadErr
          );
        }
      }
    }

    // fallback direct url fields
    if (!url)
      url =
        providerJson.url ||
        (providerJson.data && providerJson.data.url) ||
        null;
    if (url)
      console.log("generateImageIfConfigured: resolved image url", { url });

    // If the provider returned a base64 root (some APIs), try to detect and upload
    if (
      !url &&
      typeof providerJson === "string" &&
      providerJson.startsWith("data:image/")
    ) {
      try {
        const parts = providerJson.split(",");
        const b64 = parts[1];
        const buffer = Buffer.from(b64, "base64");
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: process.env.CLOUDINARY_FOLDER || "banners" },
            (err, res) => {
              if (err) return reject(err);
              resolve(res);
            }
          );
          Readable.from(buffer).pipe(stream);
        });
        url = result.secure_url || result.url || null;
        console.log(
          "generateImageIfConfigured: uploaded dataURL to cloudinary",
          { url }
        );
      } catch (uploadErr) {
        console.warn(
          "cloudinary upload failed (data URL)",
          uploadErr?.message || uploadErr
        );
      }
    }

    return { imageUrl: url, raw: j };
    // end of generateImageIfConfigured
  } catch (e) {
    console.warn("generateImageIfConfigured error", e?.message ?? e);
    return { imageUrl: null, raw: null };
  }
};

export const createBanner = async (req, res) => {
  try {
    const {
      title,
      image,
      link,
      type,
      position,
      active = false,
      priority = 0,
      kind,
    } = req.body;
    // Validate required fields early with helpful messages
    if (!image)
      return res.status(400).json({ message: "Image URL is required" });
    const banner = new Banner({
      title,
      image,
      link,
      type,
      position,
      active,
      priority,
      kind,
    });
    try {
      await banner.save();
    } catch (saveErr) {
      console.error("createBanner save error", saveErr);
      // If Mongoose validation error, send validation message
      if (saveErr && saveErr.name === "ValidationError") {
        return res.status(400).json({ message: saveErr.message });
      }
      return res
        .status(500)
        .json({ message: "Failed to save banner", error: String(saveErr) });
    }

    // broadcast banners updated for live admin UIs
    try {
      const io = getIO();
      if (io) io.emit("banners:updated", { action: "created", banner });
    } catch (e) {
      console.warn("socket emit banners:updated failed", e?.message ?? e);
    }

    res.json(banner);
  } catch (err) {
    console.error("createBanner error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const updated = await Banner.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ message: "Banner not found" });

    try {
      const io = getIO();
      if (io)
        io.emit("banners:updated", { action: "updated", banner: updated });
    } catch (e) {
      console.warn("socket emit banners:updated failed", e?.message ?? e);
    }

    res.json(updated);
  } catch (err) {
    console.error("updateBanner error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Banner.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Banner not found" });

    try {
      const io = getIO();
      if (io) io.emit("banners:updated", { action: "deleted", bannerId: id });
    } catch (e) {
      console.warn("socket emit banners:updated failed", e?.message ?? e);
    }

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteBanner error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateBanner = async (req, res) => {
  try {
    const {
      keywords,
      audience,
      style,
      language = "vi",
      kind = "banner",
      save = false,
    } = req.body || {};
    const persona = `Bạn là một copywriter và designer chuyên tạo banner quảng cáo ngắn gọn, hấp dẫn cho cửa hàng thương mại điện tử tại Việt Nam.`;
    const promptParts = [
      persona,
      `Yêu cầu: Sinh ra một JSON hợp lệ (chỉ output JSON duy nhất) mô tả banner với các trường: title, subtitle, description, cta, link (nếu không có, để empty), imagePrompt (mô tả để tạo ảnh), altText, colorPalette (một mảng 3 mã hex).`,
      `Ngôn ngữ: ${language === "vi" ? "Tiếng Việt" : language}.`,
    ];
    if (keywords) promptParts.push(`Từ khoá / Sản phẩm liên quan: ${keywords}`);
    if (audience) promptParts.push(`Đối tượng: ${audience}`);
    if (style) promptParts.push(`Phong cách mong muốn: ${style}`);
    promptParts.push(
      `Trả về JSON duy nhất. Ví dụ: {"title":"...","subtitle":"..","description":"..","cta":"Mua ngay","link":"/product/...","imagePrompt":"photo of ...","altText":"...","colorPalette":["#123456","#abcdef","#fedcba"]}`
    );

    const message = promptParts.join("\n\n");

    // call existing AI controller internally
    const fakeReq = {
      body: { message, context: "seller_support", includeSuggestions: false },
      headers: req.headers,
      cookies: req.cookies,
    };
    const aiResult = await new Promise((resolve) => {
      const fakeRes = {
        _status: 200,
        status(code) {
          this._status = code;
          return this;
        },
        json(payload) {
          resolve({ status: this._status || 200, payload });
        },
      };
      try {
        // sendAIMessage will call our fakeRes.json when done
        sendAIMessage(fakeReq, fakeRes);
      } catch (e) {
        resolve({ status: 500, payload: { message: "ai-call-failed" } });
      }
    });

    const aiText =
      aiResult?.payload?.ai_text || aiResult?.payload?.content || "";
    console.log(
      "generateBanner: ai_text preview:",
      aiText && aiText.slice ? aiText.slice(0, 400) : aiText
    );
    const parsed = safeParseJson(aiText) || {};
    console.log("generateBanner: parsed JSON:", parsed);

    // attempt image generation if prompt provided
    let imageUrl = parsed.image || parsed.imageUrl || null;
    if (!imageUrl && parsed.imagePrompt) {
      const gen = await generateImageIfConfigured(parsed.imagePrompt);
      console.log("generateBanner: image generation result:", gen);
      if (gen && gen.imageUrl) imageUrl = gen.imageUrl;
      else if (gen && gen.note) imageUrl = null;
    }

    const draft = {
      title: parsed.title || parsed.subtitle || "AI Banner",
      subtitle: parsed.subtitle || undefined,
      description: parsed.description || undefined,
      cta: parsed.cta || undefined,
      image: imageUrl || parsed.image || "",
      imagePrompt: parsed.imagePrompt || undefined,
      link: parsed.link || "",
      type: "ai",
      kind: parsed.kind || kind || "banner",
      position: parsed.position || "hero",
      active: false,
      priority: 0,
      meta: { ai: true, imagePrompt: parsed.imagePrompt || null, raw: aiText },
    };

    if (save) {
      // persist only when explicitly requested
      try {
        const banner = new Banner(draft);
        await banner.save();
        try {
          const io = getIO();
          if (io) io.emit("banners:updated", { action: "created", banner });
        } catch (e) {
          console.warn("socket emit banners:updated failed", e?.message ?? e);
        }
        return res.json({ banner, ai_raw: aiText });
      } catch (dbErr) {
        console.error("generateBanner save error", dbErr);
        return res.status(500).json({
          message: "Failed to save generated banner",
          error: String(dbErr),
        });
      }
    }

    // return preview without saving
    return res.json({ bannerDraft: draft, ai_raw: aiText });
  } catch (err) {
    console.error("generateBanner error", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};
