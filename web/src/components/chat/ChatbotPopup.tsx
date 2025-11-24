import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";

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
};

const suggestionPresets = [
  "Theo dõi đơn hàng",
  "Chính sách đổi trả",
  "Tư vấn sản phẩm mới",
  "Ưu đãi thanh toán",
];

export default function ChatbotPopup({ onClose, onOpenFull }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Tôi là trợ lý AI QQ. Bạn muốn hỏi về sản phẩm, đơn hàng hay chương trình ưu đãi nào?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.content || "Mình đã ghi nhận câu hỏi của bạn!",
          timestamp: Date.now(),
        },
      ]);
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
          <SmartToyIcon />
          <Box>
            <Typography fontWeight={700}>Trợ lý AI QQ</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Hỗ trợ 24/7
            </Typography>
          </Box>
        </Box>
        <Box>
          <Button
            size="small"
            variant="text"
            sx={{ color: "#fff", textTransform: "none", mr: 1 }}
            onClick={onOpenFull}
          >
            Mở rộng
          </Button>
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
          {suggestionPresets.map((preset) => (
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
