import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    Divider,
    IconButton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import type { ShopInfo } from "../../api/sellerService";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/useSocket";
import type { Conversation, Message, Participant } from "../../types/chat";

interface ShopChatPopupProps {
  open: boolean;
  onClose: () => void;
  shop: ShopInfo | null;
}

const formatSender = (
  sender: Message["senderId"],
  currentUserId?: string | number,
  shopFallback?: string,
  shopOwnerId?: string,
) => {
  if (typeof sender === "string") {
    if (currentUserId && sender === String(currentUserId)) return "Bạn";
    if (shopOwnerId && sender === shopOwnerId) return shopFallback ?? "Gian hàng";
    return shopFallback ?? sender;
  }
  const participant = sender as Participant;
  if (currentUserId && participant?._id && participant._id === String(currentUserId)) {
    return "Bạn";
  }
  if (shopOwnerId && participant?._id === shopOwnerId) return shopFallback || "Gian hàng";
  return participant?.name || shopFallback || "Shop";
};

export default function ShopChatPopup({ open, onClose, shop }: ShopChatPopupProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = user?._id ?? user?.id ?? undefined;
  const shopTitle = shop?.shopName ?? "Gian hàng";
  const shopAvatar = shop?.logo || undefined;

  const resetState = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setInputValue("");
    setLoadingMessages(false);
    setSending(false);
  }, []);

  const ensureConversation = useCallback(async () => {
    if (!shop?.ownerId) throw new Error("Shop không có thông tin người quản lý");
    if (conversationId) return conversationId;
    const { data } = await api.post<Conversation>("/api/chat", { participantId: shop.ownerId });
    if (!data?._id) throw new Error("Không tạo được cuộc trò chuyện");
    setConversationId(data._id);
    return data._id;
  }, [conversationId, shop?.ownerId]);

  const loadMessages = useCallback(async () => {
    if (!open || !shop?.ownerId) return;
    try {
      setLoadingMessages(true);
      const convId = await ensureConversation();
      const { data } = await api.get<Message[]>(`/api/chat/${convId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ShopChatPopup loadMessages", err);
      toast.error("Không thể tải cuộc trò chuyện với shop");
    } finally {
      setLoadingMessages(false);
    }
  }, [ensureConversation, open, shop?.ownerId]);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    if (!user) {
      toast.info("Đăng nhập để nhắn shop nhé!");
      window.dispatchEvent(new Event("openLogin"));
      onClose();
      return;
    }
    if (!shop?.ownerId) {
      toast.info("Shop chưa sẵn sàng nhận tin nhắn.");
      onClose();
      return;
    }
    loadMessages();
  }, [open, user, shop?.ownerId, loadMessages, onClose, resetState]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollToBottom();
  }, [messages, open, scrollToBottom]);

  useEffect(() => {
    if (!socket || !conversationId || !open) return;

    const handleIncoming = (payload: { convId?: string; message?: Message }) => {
      if (!payload?.convId || payload.convId !== conversationId) return;
      if (payload.message) {
        setMessages((prev) => [...prev, payload.message!]);
      }
    };

    socket.on("chat:message", handleIncoming);
    socket.on("chat:message:personal", handleIncoming);

    return () => {
      socket.off("chat:message", handleIncoming);
      socket.off("chat:message:personal", handleIncoming);
    };
  }, [socket, conversationId, open]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    try {
      setSending(true);
      const convId = await ensureConversation();
      const payload = { convId, text: inputValue.trim() };
      const { data } = await api.post<Message>("/api/chat/messages", payload);
      setMessages((prev) => [...prev, data]);
      setInputValue("");
    } catch (err) {
      console.error("ShopChatPopup handleSend", err);
      toast.error("Không gửi được tin nhắn. Thử lại nhé!");
    } finally {
      setSending(false);
    }
  };

  const renderedMessages = useMemo(() => {
    return messages.map((message) => {
      const isSelf = (() => {
        if (!currentUserId) return false;
        if (typeof message.senderId === "string") return message.senderId === String(currentUserId);
        return (message.senderId as Participant)?._id === String(currentUserId);
      })();

      return (
        <Box key={message._id ?? `${message.createdAt}-${message.text}`}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: isSelf ? "flex-end" : "flex-start",
            mb: 1.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {formatSender(message.senderId, currentUserId, shopTitle, shop?.ownerId)}
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor: isSelf ? "primary.main" : "#f3f4f6",
              color: isSelf ? "primary.contrastText" : "text.primary",
              maxWidth: "80%",
            }}
          >
            <Typography variant="body2">{message.text}</Typography>
          </Box>
        </Box>
      );
    });
  }, [messages, currentUserId, shopTitle, shop?.ownerId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 3, pt: 2, pb: 1 }}>
        <Avatar src={shopAvatar} alt={shopTitle} sx={{ width: 48, height: 48, border: "2px solid #eef2ff" }} />
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700}>{shopTitle}</Typography>
          <Typography variant="body2" color="text.secondary">
            Trao đổi trực tiếp với shop
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Divider sx={{ mt: 1 }} />

      <Box sx={{ px: 3, py: 2, minHeight: 320, maxHeight: 420, overflowY: "auto" }}>
        {loadingMessages ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
            <CircularProgress size={32} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: "center", color: "text.secondary", py: 6 }}>
            <Typography variant="body2">Bắt đầu cuộc trò chuyện với shop nhé!</Typography>
          </Box>
        ) : (
          <>{renderedMessages}</>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      <Box sx={{ px: 3, py: 2 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Nhập tin nhắn..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            sx={{ minWidth: 120, textTransform: "none" }}
          >
            Gửi
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
