import SendIcon from "@mui/icons-material/Send";
import {
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
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { cartService } from "../../api/cartService";
import RobotWaveIcon from "../../components/chat/RobotWaveIcon";
import { useAuth } from "../../context/AuthContext";

type AIMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
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

export default function SellerAIChatPage() {
  const location = useLocation();
  const { role } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: "assistant",
      content: "Xin chào! 👋 Tôi là trợ lý AI dành cho người bán. Tôi có thể giúp bạn với quản lý sản phẩm, xử lý đơn hàng, vận chuyển, quản lý kho và các chính sách. Bạn cần giúp gì?",
      timestamp: new Date(),
    },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion>({ products: [], categories: [] });
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [assistantMeta, setAssistantMeta] = useState<{ role?: string; identified?: boolean } | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const handleSend = async () => {
    if (!text.trim() || loading) return;

    const userMessage: AIMessage = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setText("");
    setLoading(true);

    try {
      const { data } = await api.post<AIServerResp>("/api/ai-chat", {
        message: text,
        context: "seller_support",
        role: role || "seller",
        metadata: {
          route: location.pathname,
          search: location.search,
          source: "seller_ai_chat_page",
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

      if (data?.suggestions) setSuggestions(data.suggestions as Suggestion);
      else setSuggestions({ products: [], categories: [] });
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
  }, [messages]);

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
              Trợ lý AI - Hỗ trợ Người Bán
            </Typography>
          </Box>
          {assistantMeta && (
            <Tooltip
              title={
                assistantMeta.identified
                  ? "Đang dùng dữ liệu bán hàng của bạn"
                  : "Chưa xác thực người dùng"
              }
            >
              <Chip
                size="small"
                variant="outlined"
                sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                label={`Vai trò: ${assistantMeta.role || role || "seller"}`}
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
          {suggestions?.products?.length > 0 && (
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
                          if (msg && msg.toLowerCase().includes("unauthorized")) toast.warning("Vui lòng đăng nhập để thêm vào giỏ hàng");
                          else toast.error(msg || "Thêm vào giỏ thất bại");
                        } finally {
                          setAddingProductId(null);
                        }
                      }}
                    >
                      Thêm giỏ
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        const slugBase = (p.title || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();
                        const slug = slugBase.replace(/\s+/g, "-");
                        window.location.href = p.buyUrl || `/product/${slug}-${p._id}`;
                      }}
                    >
                      Xem sản phẩm
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
            disabled={loading}
            multiline
            maxRows={3}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={loading || !text.trim()}
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
          {["Sản phẩm", "Đơn hàng", "Kho hàng", "Vận chuyển", "Chính sách"].map((topic) => (
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
