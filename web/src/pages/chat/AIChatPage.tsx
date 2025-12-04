import SendIcon from "@mui/icons-material/Send";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { cartService } from "../../api/cartService";
import RobotWaveIcon from "../../components/chat/RobotWaveIcon";
import { useAuth } from "../../context/AuthContext";

const productSuggestionKeywords = [
  "sản phẩm mới",
  "gợi ý sản phẩm",
  "sản phẩm nổi bật",
  "sản phẩm hot",
  "sản phẩm bán chạy",
];

const shouldSuggestProducts = (content = "") => {
  const normalized = content.toLowerCase();
  return productSuggestionKeywords.some((keyword) => normalized.includes(keyword));
};

type AIMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date | string;
};

type Suggestion = {
  products: Array<{
    _id: string;
    title: string;
    price: number;
    image?: string | null;
    categories?: string[];
    buyUrl?: string;
  }>;
  categories: Array<{ _id: string; name: string }>;
};

type AIServerResp = {
  role?: string;
  content: string;
  suggestions?: Suggestion;
  context?: Array<{ title: string; items: string[] }>;
  personalization?: {
    role?: string;
    identified?: boolean;
  } | null;
};

export default function AIChatPage() {
  const location = useLocation();
  const { role, user } = useAuth();
  const buildGreetingMessage = () => ({
    role: "assistant" as const,
    content:
      "Xin chào! 👋 Tôi là trợ lý AI của cửa hàng. Tôi có thể giúp bạn với các câu hỏi về sản phẩm, đơn hàng, vận chuyển và chính sách. Bạn cần giúp gì?",
    timestamp: new Date(),
  });
  const [messages, setMessages] = useState<AIMessage[]>(() => [
    buildGreetingMessage(),
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion>({ products: [], categories: [] });
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [assistantMeta, setAssistantMeta] = useState<{ role?: string; identified?: boolean } | null>(null);
  const [storedHistory, setStoredHistory] = useState<AIMessage[] | null>(null);
  const [historyChoiceMade, setHistoryChoiceMade] = useState(true);
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const historyStorageKey = useMemo(() => {
    const userId = user?._id || user?.id || "guest";
    return `qq_ai_chat_history_${userId}`;
  }, [user?._id, user?.id]);

  const handleSend = async () => {
    if (!text.trim() || loading || !historyChoiceMade) return;

    const trimmedContent = text.trim();
    const wantsProductSuggestions = shouldSuggestProducts(trimmedContent);

    const userMessage: AIMessage = {
      role: "user",
      content: trimmedContent,
      timestamp: new Date(),
    };

    const recentHistory = messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const nextMessages: AIMessage[] = [...messages, userMessage];

    setMessages(nextMessages);
    setText("");
    setLoading(true);
    setShowProductSuggestions(false);

    try {
      const { data } = await api.post<AIServerResp>("/api/ai-chat", {
        message: trimmedContent,
        context: "user_support",
        role: role || "user",
        history: recentHistory,
        metadata: {
          route: location.pathname,
          search: location.search,
          source: "ai_chat_page",
          title:
            typeof document !== "undefined" && document?.title ? document.title : undefined,
        },
      });

      const aiMessage: AIMessage = {
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // If backend returned structured suggestions, set them so UI can render cards
      const nextSuggestions = (data?.suggestions || {
        products: [],
        categories: [],
      }) as Suggestion;
      setSuggestions(nextSuggestions);
      setShowProductSuggestions(
        wantsProductSuggestions && (nextSuggestions.products?.length ?? 0) > 0
      );
      setAssistantMeta(data?.personalization ?? null);
    } catch (err) {
      console.error("AI chat error:", err);
      const errorMessage: AIMessage = {
        role: "assistant",
        content: "Xin lỗi, tôi gặp lỗi kỹ thuật. Vui lòng thử lại sau.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => messagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
    }
  };

  useEffect(() => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, historyChoiceMade]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHistoryInitialized(false);
    setHistoryChoiceMade(true);
    setStoredHistory(null);
    try {
      const stored = window.localStorage.getItem(historyStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((msg: AIMessage) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
          }));
          setStoredHistory(normalized);
          setHistoryChoiceMade(false);
          setHistoryInitialized(true);
          return;
        }
      }
      setStoredHistory(null);
      setHistoryChoiceMade(true);
      setHistoryInitialized(true);
    } catch (error) {
      console.warn("Failed to load chat history", error);
      setStoredHistory(null);
      setHistoryChoiceMade(true);
      setHistoryInitialized(true);
    }
  }, [historyStorageKey]);

  useEffect(() => {
    if (!historyChoiceMade || !historyInitialized || typeof window === "undefined") return;
    try {
      const serialized = JSON.stringify(
        messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp
            ? new Date(msg.timestamp).toISOString()
            : undefined,
        }))
      );
      window.localStorage.setItem(historyStorageKey, serialized);
    } catch (error) {
      console.warn("Failed to persist chat history", error);
    }
  }, [messages, historyChoiceMade, historyStorageKey, historyInitialized]);

  const handleContinueHistory = () => {
    if (storedHistory?.length) {
      setMessages(storedHistory.map((msg) => ({ ...msg })));
    }
    setHistoryChoiceMade(true);
    setShowProductSuggestions(false);
  };

  const handleStartNewConversation = () => {
    setStoredHistory(null);
    setHistoryChoiceMade(true);
    setMessages([buildGreetingMessage()]);
    setSuggestions({ products: [], categories: [] });
    setShowProductSuggestions(false);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(historyStorageKey);
      }
    } catch (error) {
      console.warn("Failed to clear chat history", error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: "700px",
          height: "600px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          borderRadius: 3,
          overflow: "hidden",
        }}
        elevation={3}
      >
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RobotWaveIcon size={44} />
            <Typography variant="h6" fontWeight={700}>
              Trợ lý AI - Hỗ trợ 24/7
            </Typography>
          </Box>
          {assistantMeta && (
            <Tooltip
              title={
                assistantMeta.identified
                  ? "Đang sử dụng dữ liệu của bạn"
                  : "Chưa xác thực người dùng"
              }
            >
              <Chip
                size="small"
                variant="outlined"
                sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                label={`Vai trò: ${assistantMeta.role || role || "user"}`}
              />
            </Tooltip>
          )}
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {!historyChoiceMade && storedHistory?.length && (
            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
                background: "#eef2ff",
                border: "1px solid rgba(99,102,241,0.3)",
                alignItems: "center",
                gap: 1,
              }}
              action={
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" variant="contained" onClick={handleContinueHistory}>
                    Tiếp tục
                  </Button>
                  <Button size="small" variant="outlined" onClick={handleStartNewConversation}>
                    Trò chuyện mới
                  </Button>
                </Box>
              }
            >
              Bạn có cuộc trò chuyện trước với trợ lý AI. Bạn muốn tiếp tục hay bắt đầu cuộc trò chuyện mới?
            </Alert>
          )}
          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <Paper
                sx={{
                  maxWidth: "80%",
                  p: 2,
                  borderRadius: 2,
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "#f0f2f5",
                  color: msg.role === "user" ? "#fff" : "#000",
                }}
                elevation={0}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="caption" color="text.secondary">
                Đang xử lý...
              </Typography>
            </Box>
          )}
          {/* Render suggestions (if any) under the messages area */}
          {showProductSuggestions && suggestions?.products?.length > 0 && (
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
              {suggestions.products.map((p) => (
                <Card key={p._id} sx={{ width: 200 }}>
                  {p.image && (
                    <CardMedia component="img" height="120" image={p.image} alt={p.title} />
                  )}
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {p.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.categories?.slice(0, 2).join(" • ")}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ mt: 1 }}>
                      {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                        p.price || 0
                      )}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      disabled={addingProductId === p._id}
                      onClick={async () => {
                        try {
                          setAddingProductId(p._id);
                          await cartService.addToCart({ productId: p._id, quantity: 1 });
                          toast.success(`✅ Đã thêm "${p.title}" vào giỏ hàng`);
                        } catch (err: unknown) {
                          let msg = "Thêm vào giỏ thất bại";
                          if (err instanceof Error) msg = err.message;
                          else msg = String(err);
                          if (msg && msg.toLowerCase().includes("unauthorized")) {
                            toast.warning("Vui lòng đăng nhập để thêm vào giỏ hàng");
                          } else {
                            toast.error(msg || "Thêm vào giỏ thất bại");
                          }
                        } finally {
                          setAddingProductId(null);
                        }
                      }}
                    >
                      Mua ngay
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        const slugBase = (p.title || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();
                        const slug = slugBase.replace(/\s+/g, "-");
                        window.location.href = p.buyUrl || `/product/${slug}-${p._id}`;
                      }}
                    >
                      Xem
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
          <div ref={messagesRef} />
        </Box>

        {/* Divider */}
        <Divider />

        {/* Input */}
        <Box sx={{ p: 2, display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Nhập câu hỏi của bạn..."
            disabled={loading || !historyChoiceMade}
            multiline
            maxRows={3}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={loading || !text.trim() || !historyChoiceMade}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              minWidth: 50,
              height: "auto",
            }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Paper>

      {/* Quick tips */}
      <Box sx={{ mt: 3, maxWidth: "700px", color: "#fff", textAlign: "center" }}>
        <Typography variant="caption" display="block" sx={{ mb: 1 }}>
          Bạn có thể hỏi về:
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          {["Sản phẩm", "Đơn hàng", "Vận chuyển", "Trả hàng", "Thanh toán"].map((topic) => (
            <Chip
              key={topic}
              label={topic}
              variant="outlined"
              size="small"
              sx={{
                color: "#fff",
                borderColor: "#fff",
                cursor: "pointer",
                "&:hover": {
                  background: "rgba(255,255,255,0.1)",
                },
              }}
              onClick={() => setText(topic)}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
