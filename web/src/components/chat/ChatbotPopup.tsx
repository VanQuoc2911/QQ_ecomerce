import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import RobotWaveIcon from "./RobotWaveIcon";

interface Props {
  onClose: () => void;
  onOpenFull?: () => void;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type AIResponse = {
  content: string;
  suggestions?: {
    products?: Array<{ _id: string; title: string }>;
    categories?: Array<{ _id: string; name: string }>;
  };
  context?: Array<{ title: string; items: string[] }>;
  personalization?: {
    role?: string;
    identified?: boolean;
  } | null;
};

const rolePresets: Record<string, string[]> = {
  seller: [
    "Kiểm tra đơn đang chờ",
    "Gợi ý trả lời khách",
    "Hướng dẫn cập nhật kho",
    "Thống kê doanh thu hôm nay",
  ],
  admin: [
    "Tình trạng hệ thống",
    "Báo cáo người dùng",
    "Yêu cầu hỗ trợ seller",
  ],
  shipper: [
    "Lộ trình giao hàng",
    "Xác nhận đơn đã giao",
    "Hỗ trợ khách đổi lịch",
  ],
  user: [
    "Theo dõi đơn hàng",
    "Chính sách đổi trả",
    "Tư vấn sản phẩm mới",
    "Ưu đãi thanh toán",
  ],
  default: [
    "Hỗ trợ sử dụng QQ",
    "Đăng ký tài khoản",
    "Khuyến mãi đang có",
  ],
};

const greetingByRole: Record<string, (name?: string | null) => string> = {
  seller: (name) =>
    name
      ? `Xin chào ${name}! Tôi có thể hỗ trợ bạn về đơn hàng, tồn kho hay báo cáo nào hôm nay? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.`
      : "Xin chào seller! Tôi có thể hỗ trợ bạn về đơn hàng, tồn kho hay báo cáo nào hôm nay? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.",
  admin: (name) =>
    name
      ? `Chào ${name}! Bạn muốn xem thống kê, xử lý báo cáo hay hỗ trợ người dùng nào không? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.`
      : "Chào admin QQ! Bạn muốn xem thống kê, xử lý báo cáo hay hỗ trợ người dùng nào không? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.",
  shipper: (name) =>
    name
      ? `Xin chào ${name}! Bạn cần hỗ trợ theo dõi tuyến đường hay xác nhận giao hàng chứ? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.`
      : "Xin chào shipper! Bạn cần hỗ trợ theo dõi tuyến đường hay xác nhận giao hàng chứ? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.",
  user: (name) =>
    name
      ? `Xin chào ${name}! Tôi là trợ lý AI QQ. Bạn muốn hỏi về sản phẩm, đơn hàng hay chương trình ưu đãi nào? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.`
      : "Xin chào! Tôi là trợ lý AI QQ. Bạn muốn hỏi về sản phẩm, đơn hàng hay chương trình ưu đãi nào? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.",
  default: (name) =>
    name
      ? `Xin chào ${name}! Tôi là trợ lý AI QQ. Bạn cần hỗ trợ gì hôm nay? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.`
      : "Xin chào! Tôi là trợ lý AI QQ. Bạn cần hỗ trợ gì hôm nay? Tôi có quyền truy cập toàn bộ dữ liệu của hệ thống để trả lời chính xác nhất.",
};

export default function ChatbotPopup({ onClose, onOpenFull }: Props) {
  const location = useLocation();
  const { role, user } = useAuth();
  const effectiveRole = role ?? "default";
  const displayName = useMemo(() => {
    if (!user?.name) return null;
    const trimmed = user.name.trim();
    if (!trimmed) return null;
    const [firstName] = trimmed.split(/\s+/);
    return firstName;
  }, [user?.name]);
  const initialGreeting = useMemo(() => {
    const builder = greetingByRole[effectiveRole] ?? greetingByRole.default;
    return builder(displayName);
  }, [effectiveRole, displayName]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialGreeting,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [personalizationMeta, setPersonalizationMeta] = useState<{ role?: string; identified?: boolean } | null>(null);

  const presets = rolePresets[effectiveRole] ?? rolePresets.default;

  const pageContext = useMemo(
    () => ({
      route: location.pathname,
      hash: location.hash,
      search: location.search,
      title:
        typeof document !== "undefined" && document?.title ? document.title : undefined,
    }),
    [location.pathname, location.hash, location.search]
  );

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: initialGreeting,
        timestamp: Date.now(),
      },
    ]);
    setPersonalizationMeta(null);
  }, [initialGreeting]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const now = Date.now();
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed, timestamp: now },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post<AIResponse>("/api/ai-chat", {
        message: trimmed,
        context: "floating_widget",
        role: effectiveRole,
        metadata: {
          route: pageContext.route,
          hash: pageContext.hash,
          search: pageContext.search,
          title: pageContext.title,
          source: "floating_widget",
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.content || "Mình đã ghi nhận câu hỏi của bạn!",
          timestamp: Date.now(),
        },
      ]);

      setPersonalizationMeta(data?.personalization ?? null);
    } catch (err) {
      console.error("Floating chatbot error", err);
      toast.error("Chatbot đang bận, thử lại sau nhé!");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Xin lỗi, tôi đang gặp sự cố. Bạn vui lòng thử lại sau ít phút.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={10}
      sx={{
        width: 360,
        height: 480,
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backdropFilter: "blur(8px)",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <RobotWaveIcon size={36} />
          <Box>
            <Typography fontWeight={700}>Trợ lý AI QQ</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Hỗ trợ thông minh – truy cập toàn bộ dữ liệu hệ thống
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {personalizationMeta && (
            <Tooltip
              title={
                personalizationMeta.identified
                  ? "Đang tham chiếu dữ liệu cá nhân của bạn"
                  : "Chưa xác thực danh tính"
              }
            >
              <Chip
                size="small"
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.6)",
                  borderWidth: 1,
                }}
                variant="outlined"
                label={`Vai trò: ${personalizationMeta.role || effectiveRole}`}
              />
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={onOpenFull}
            sx={{ color: "#fff", mr: 1 }}
            aria-label="Mở rộng"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, p: 2, background: "#f8fafc", overflowY: "auto" }}>
        {messages.map((msg, index) => (
          <Box key={`${msg.timestamp}-${index}`} sx={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", mb: 1.2 }}>
            <Box
              sx={{
                maxWidth: "85%",
                px: 1.5,
                py: 1,
                borderRadius: 2,
                color: msg.role === "user" ? "#fff" : "#0f172a",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, #667eea, #764ba2)"
                    : "#fff",
                boxShadow: msg.role === "user" ? "0 6px 18px rgba(102, 126, 234, 0.25)" : "0 4px 12px rgba(15,23,42,0.08)",
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {msg.content}
              </Typography>
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <CircularProgress size={18} />
            <Typography variant="caption">AI đang trả lời...</Typography>
          </Box>
        )}
        <div ref={endRef} />
      </Box>

      <Box sx={{ px: 2, py: 1.5, background: "#fff", borderTop: "1px solid #e2e8f0" }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
          {presets.map((preset) => (
            <Chip
              key={preset}
              label={preset}
              size="small"
              variant="outlined"
              onClick={() => setInput(preset)}
            />
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Nhắn tin cho QQ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || loading}
            sx={{
              minWidth: 56,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : <SendIcon />}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
