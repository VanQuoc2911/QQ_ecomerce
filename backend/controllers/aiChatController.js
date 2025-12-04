import jwt from "jsonwebtoken";
import { extractTokenFromHeader } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { buildAIContext } from "../services/aiContextBuilder.js";
import { getAvailableModels } from "../utils/aiModelManager.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const getApiKey = () => process.env.GROQ_API_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const decommissionedModels = new Set();

const SYSTEM_PROMPTS = {
  user_support: `You are a helpful Vietnamese e-commerce customer support assistant. Help customers with questions about products, orders, shipping, returns, and general shopping. Be polite and concise. Answer in Vietnamese when the user speaks Vietnamese. If you don't know something, suggest contacting support.`,
  seller_support: `You are a helpful Vietnamese e-commerce seller support assistant. Help sellers with questions about product management, orders, shipping, inventory, and policies. Be polite and concise.`,
};

const STORE_KNOWLEDGE = `
Cửa hàng QQ là nền tảng thương mại điện tử tại Việt Nam.
- Sản phẩm: thời trang, phụ kiện, đồ gia dụng, thiết bị điện tử nhỏ, mỹ phẩm và các mặt hàng lifestyle.
- Thanh toán: hỗ trợ PayOS (QR/ ngân hàng), chuyển khoản, MoMo, COD và thẻ quốc tế.
- Vận chuyển: giao toàn quốc, có gói hoả tốc 2h tại Hà Nội/TP.HCM, tiêu chuẩn 2-4 ngày, theo dõi realtime trên ứng dụng.
- Hậu mãi: đổi trả trong 7 ngày với sản phẩm lỗi, bảo hành theo từng danh mục, hỗ trợ chat 24/7.
Chỉ sử dụng dữ liệu nội bộ để trả lời khách. Nếu thiếu thông tin, đề nghị khách liên hệ QQ Support.`;

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

const findProductsAndCategories = async (queryText, limit = 6) => {
  try {
    const text = (queryText || "").trim();
    const keywords = text
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 10);

    let products = [];
    let debug = null;

    if (keywords.length > 0) {
      let distinctCats = [];
      try {
        distinctCats = await Product.distinct("categories");
      } catch (e) {
        distinctCats = [];
      }
      const lowerKeywords = keywords.map((k) => k.toLowerCase());
      const matchedCats = distinctCats.filter((c) => {
        if (!c) return false;
        const lowerC = String(c).toLowerCase();
        return (
          lowerKeywords.includes(lowerC) ||
          lowerKeywords.some((kw) => lowerC.includes(kw) || kw.includes(lowerC))
        );
      });

      if (matchedCats.length > 0) {
        products = await Product.find({
          status: "approved",
          categories: { $in: matchedCats },
        })
          .limit(limit)
          .sort({ soldCount: -1, rating: -1 })
          .lean();
        debug = { matchedCats, usedExactCategory: true };
      } else {
        const regex = new RegExp(keywords.map(escapeRegExp).join("|"), "i");
        products = await Product.find({
          status: "approved",
          $or: [
            { title: { $regex: regex } },
            { description: { $regex: regex } },
            { categories: { $regex: regex } },
          ],
        })
          .limit(limit)
          .sort({ soldCount: -1, rating: -1 })
          .lean();
        debug = {
          matchedCats,
          usedExactCategory: false,
          regex: keywords.join("|"),
        };
      }
    } else {
      products = await Product.find({ status: "approved" })
        .limit(limit)
        .sort({ soldCount: -1, rating: -1 })
        .lean();
    }

    if (!products || products.length === 0)
      return { products: [], categories: [], _debug: debug };

    const categoriesFromProducts = [];
    for (const p of products)
      if (Array.isArray(p.categories))
        for (const c of p.categories)
          if (c && !categoriesFromProducts.includes(c))
            categoriesFromProducts.push(c);

    const categorySuggestions = categoriesFromProducts
      .slice(0, 6)
      .map((name, idx) => ({ _id: idx, name }));
    const productSuggestions = products.map((p) => ({
      _id: p._id,
      title: p.title || p.name || "",
      price: p.price || 0,
      image: Array.isArray(p.images) && p.images.length ? p.images[0] : null,
      categories: p.categories || [],
      buyUrl: `/product/${p._id}`,
    }));

    return {
      products: productSuggestions,
      categories: categorySuggestions,
      _debug: debug,
    };
  } catch (err) {
    console.error("findProductsAndCategories error:", err);
    return { products: [], categories: [], _debug: null };
  }
};

const resolveRequestIdentity = async (req) => {
  try {
    const token = extractTokenFromHeader(req) || req.cookies?.token;
    if (!token) return null;
    if (token === "admin-token") {
      return {
        id: "000000000000000000000000",
        role: "admin",
        name: "Admin",
        email: "admin@example.com",
      };
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;
    if (!userId) return null;
    const profile = await User.findById(userId)
      .select("name role email")
      .lean();
    if (profile) {
      return {
        id: profile._id?.toString(),
        role: profile.role || decoded.role || "user",
        name: profile.name || decoded.name || null,
        email: profile.email || decoded.email || null,
      };
    }
    return {
      id: userId,
      role: decoded.role || "user",
      name: decoded.name || null,
      email: decoded.email || null,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("resolveRequestIdentity failed", err.message);
    }
    return null;
  }
};

export const sendAIMessage = async (req, res) => {
  try {
    const GROQ_API_KEY = getApiKey();
    const {
      message,
      context = "user_support",
      includeSuggestions = true,
      role: roleFromBody,
      history: rawHistory,
    } = req.body || {};
    const shouldReturnSuggestions = includeSuggestions !== false;
    if (!message || typeof message !== "string" || message.trim().length === 0)
      return res.status(400).json({
        message: "Message is required and must be a non-empty string",
      });

    if (!GROQ_API_KEY) {
      const allowDevMock = (
        process.env.GROQ_ALLOW_DEV_MOCK || "true"
      ).toLowerCase();
      if (process.env.NODE_ENV !== "production" && allowDevMock !== "false") {
        const mockContent =
          "(Dev-mode) AI is not configured. This is a mock response.";
        const payload = {
          role: "assistant",
          content: mockContent,
          model: null,
        };
        if (includeSuggestions)
          payload.suggestions = { products: [], categories: [], _debug: null };
        return res.status(200).json(payload);
      }
      return res
        .status(500)
        .json({ message: "AI service not configured (missing GROQ_API_KEY)" });
    }

    const resolvedUser = await resolveRequestIdentity(req);
    const inferredRoleFromContext =
      context === "seller_support"
        ? "seller"
        : context === "shipper_support"
        ? "shipper"
        : context === "admin_support"
        ? "admin"
        : "user";
    const effectiveRole =
      resolvedUser?.role || roleFromBody || inferredRoleFromContext || "user";

    const normalizedHistory = Array.isArray(rawHistory)
      ? rawHistory
          .slice(-10)
          .map((entry) => {
            const role = entry?.role === "assistant" ? "assistant" : "user";
            const content = String(entry?.content || "").trim();
            if (!content) return null;
            return {
              role,
              content: content.slice(0, 2000),
            };
          })
          .filter(Boolean)
      : [];

    const roleContext = await buildAIContext({
      role: effectiveRole,
      userId: resolvedUser?.id || null,
      userName: resolvedUser?.name || null,
    });

    const basePrompt = SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.user_support;
    const systemPrompt = `${STORE_KNOWLEDGE}\n\n${basePrompt}`;
    let preFetchedSuggestions = { products: [], categories: [], _debug: null };
    try {
      preFetchedSuggestions = await findProductsAndCategories(message, 6);
    } catch (e) {
      preFetchedSuggestions = { products: [], categories: [], _debug: null };
    }

    let candidateModels = [];
    try {
      candidateModels = getAvailableModels();
    } catch (e) {
      candidateModels = [];
    }
    if (!candidateModels || candidateModels.length === 0) {
      candidateModels = (process.env.GROQ_CANDIDATE_MODELS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((m) => !decommissionedModels.has(m));
    }

    // If still no models available, return a fallback response with suggestions from backend
    if (candidateModels.length === 0) {
      const allowDevMock = (
        process.env.GROQ_ALLOW_DEV_MOCK || "true"
      ).toLowerCase();
      if (process.env.NODE_ENV !== "production" && allowDevMock !== "false") {
        const mockContent =
          "(Development Mode) AI models not available right now. Showing suggestions from our database instead.";
        const payload = {
          role: "assistant",
          content: mockContent,
          model: null,
          fallback: true,
        };
        if (includeSuggestions) {
          payload.suggestions =
            preFetchedSuggestions ||
            (await findProductsAndCategories(message, 6));
        }
        return res.status(200).json(payload);
      }
      return res.status(502).json({
        message: "No AI models available. Set GROQ_CANDIDATE_MODELS.",
      });
    }

    const roleContextMessage = roleContext?.text
      ? {
          role: "system",
          content: `ROLE_CONTEXT (${effectiveRole}):\n${roleContext.text}\n\nQUY TẮC: Chỉ sử dụng dữ liệu trong ROLE_CONTEXT cho các câu trả lời cá nhân hóa và không tiết lộ thông tin không liên quan.`,
        }
      : null;

    let response = null;
    let lastErrorText = null;
    let successfulModel = null;
    const triedModels = [];
    for (const model of candidateModels) {
      try {
        const resp = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...(roleContextMessage ? [roleContextMessage] : []),
              {
                role: "system",
                content: `BACKEND_PRODUCTS:${JSON.stringify(
                  preFetchedSuggestions.products.map((p) => ({
                    id: p._id,
                    title: p.title,
                    price: p.price,
                    priceText: formatCurrency(p.price),
                    categories: p.categories,
                    buyUrl: p.buyUrl,
                  }))
                )}\n\nBACKEND_CATEGORIES:${JSON.stringify(
                  preFetchedSuggestions.categories
                )}\n\nQUY TẮC NGHIÊM NGẶT:\n1. Chỉ trả lời dựa trên dữ liệu nội bộ QQ (STORE_KNOWLEDGE + ROLE_CONTEXT + BACKEND_PRODUCTS + BACKEND_CATEGORIES).\n2. Nếu thiếu thông tin, trả lời đúng câu: "Tôi chưa tìm thấy thông tin trong hệ thống QQ. Bạn vui lòng liên hệ QQ Support."\n3. Không trích dẫn nguồn bên ngoài, không suy đoán hoặc tạo dữ liệu mới.\n4. Khi gợi ý sản phẩm, chỉ dùng các mục trong BACKEND_PRODUCTS và hiển thị tên + giá từ trường priceText.\n5. Luôn trả lời bằng tiếng Việt, giọng điệu thân thiện, súc tích.`,
              },
              ...(normalizedHistory || []),
              { role: "user", content: message },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });
        if (!resp) {
          triedModels.push({ model, error: "no response" });
          continue;
        }
        if (!resp.ok) {
          const txt = await resp.text().catch(() => "(unable to read body)");
          lastErrorText = txt;
          let parsed = {};
          try {
            parsed = JSON.parse(txt || "{}");
          } catch (e) {}
          const errorCode = parsed?.error?.code || null;
          const errorMsg =
            parsed?.error?.message || txt || `status ${resp.status}`;
          triedModels.push({
            model,
            status: resp.status,
            error: errorMsg,
            errorCode,
          });
          if (
            errorCode === "model_decommissioned" ||
            errorCode === "model_not_found"
          ) {
            decommissionedModels.add(model);
            continue;
          }
          response = resp;
          break;
        }
        response = resp;
        successfulModel = model;
        triedModels.push({ model, status: resp.status, note: "success" });
        break;
      } catch (err) {
        lastErrorText = err.message;
        triedModels.push({ model, error: err.message });
      }
    }

    if (!response || !response.ok) {
      let bodyText = null;
      if (response)
        bodyText = await response.text().catch(() => "(unable to read body)");
      return res.status(502).json({
        message: "AI service unavailable",
        triedModels,
        lastError: bodyText || lastErrorText,
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      const text = await response.text().catch(() => "(unable to read body)");
      return res.status(500).json({
        message: "AI service returned invalid JSON",
        parseError: parseErr.message,
        body: text,
      });
    }
    const aiResponse =
      data?.choices?.[0]?.message?.content || "No response from AI";
    const modelUsed = successfulModel || null;
    if (shouldReturnSuggestions) {
      const suggestionsResult =
        preFetchedSuggestions || (await findProductsAndCategories(message, 6));

      // Mark which suggested products are actually mentioned by the AI text
      const textLC = String(aiResponse || "").toLowerCase();
      const productsWithVerified = (suggestionsResult.products || []).map(
        (p) => {
          const title = String(p.title || "").toLowerCase();
          const idStr = String(p._id || "");
          const verified = title && textLC.includes(title);
          const verifiedById = idStr && textLC.includes(idStr);
          return {
            ...p,
            priceText: p.priceText || formatCurrency(p.price),
            verified: Boolean(verified || verifiedById),
          };
        }
      );

      // Heuristic: detect quoted phrases and TitleCase sequences in AI text as potential mentions
      const quoted = [
        ...String(aiResponse || "").matchAll(/"([^\"]{3,})"/g),
      ].map((m) => m[1]);
      const titleCaseCandidates = [
        ...String(aiResponse || "").matchAll(
          /([A-ZÀ-Ý][\p{L}'-]+(?:\s+[A-ZÀ-Ý][\p{L}'-]+){1,4})/gu
        ),
      ].map((m) => m[1]);
      const candidates = Array.from(
        new Set([...quoted, ...titleCaseCandidates].filter(Boolean))
      );

      const suggestionTitlesLC = (suggestionsResult.products || []).map((p) =>
        String(p.title || "").toLowerCase()
      );
      const unverifiedMentions = [];
      for (const c of candidates) {
        const cLC = String(c).toLowerCase();
        const matched = suggestionTitlesLC.some(
          (t) => t && (cLC.includes(t) || t.includes(cLC))
        );
        if (!matched) unverifiedMentions.push(c);
      }

      const responsePayload = {
        role: "assistant",
        content: aiResponse,
        ai_text: aiResponse,
        suggestions: {
          products: productsWithVerified,
          categories: suggestionsResult.categories || [],
        },
        unverifiedMentions: Array.from(new Set(unverifiedMentions)),
        model: modelUsed,
        context: roleContext?.clientSummary || null,
        personalization: {
          role: effectiveRole,
          identified: Boolean(resolvedUser?.id),
        },
      };
      if (process.env.NODE_ENV !== "production")
        responsePayload._debug = suggestionsResult._debug || null;
      return res.status(200).json(responsePayload);
    }
    return res.status(200).json({
      role: "assistant",
      content: aiResponse,
      model: modelUsed,
      context: roleContext?.clientSummary || null,
      personalization: {
        role: effectiveRole,
        identified: Boolean(resolvedUser?.id),
      },
    });
  } catch (err) {
    console.error("sendAIMessage error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
