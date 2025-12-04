import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VideoCallOutlinedIcon from "@mui/icons-material/VideoCallOutlined";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/useSocket";
import type { Message } from "../../types/chat";

export default function ChatPage() {
  const { convId } = useParams<{ convId: string }>();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => setTimeout(() => messagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);

  useEffect(() => {
    if (!convId) return;
    const load = async () => {
      try {
        const { data } = await api.get<Message[]>(`/api/chat/${convId}/messages`);
        setMessages(data || []);
        // join room
        if (socket) socket.emit('joinChat', { convId });
        scrollToBottom();
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [convId, socket]);

  const handleSend = async () => {
    if (!convId || !text.trim()) return;
    try {
      const { data } = await api.post<Message>('/api/chat/messages', { convId, text });
      setMessages((m) => [...m, data]);
      setText("");
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const onMessage = (payload: { convId?: string; message?: Message }) => {
      if (!payload || !payload.convId) return;
      if (payload.convId === convId) {
        const newMsg = payload.message;
        if (newMsg) {
          setMessages((m) => [...m, newMsg]);
          scrollToBottom();
        }
      }
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:message:personal', onMessage);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:message:personal', onMessage);
    };
  }, [socket, convId]);

  useEffect(() => {
    if (!user) {
      window.dispatchEvent(new Event("openLogin"));
      navigate("/home");
    }
  }, [user, navigate]);

  const getSenderName = (sender?: Message["senderId"]) => {
    if (typeof sender === "string") return sender;
    return sender?.name || sender?._id || "Ẩn danh";
  };

  const isMine = (sender: Message["senderId"]) => {
    const senderId = typeof sender === "string" ? sender : sender?._id;
    return senderId === user?._id;
  };

  const enhancedMessages = useMemo(
    () =>
      messages.map((msg, idx) => ({
        ...msg,
        localId: `${msg._id ?? idx}-${idx}`,
      })),
    [messages]
  );

  const groupedMessages = useMemo(() => {
    const items: Array<
      | { type: "date"; label: string; id: string }
      | { type: "message"; payload: (typeof enhancedMessages)[number] }
    > = [];
    let lastLabel = "";
    enhancedMessages.forEach((msg, idx) => {
      const created = msg.createdAt ? new Date(msg.createdAt) : undefined;
      const label = created ? created.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" }) : "Hôm nay";
      if (label !== lastLabel) {
        items.push({ type: "date", label, id: `${label}-${idx}` });
        lastLabel = label;
      }
      items.push({ type: "message", payload: msg });
    });
    return items;
  }, [enhancedMessages]);

  if (!user) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 35%, #ffffff 90%)",
        position: "relative",
        overflow: "hidden",
        py: { xs: 3, md: 6 },
        px: { xs: 1.5, md: 4 },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.15), transparent 45%)",
          pointerEvents: "none",
        }}
      />
      <Box sx={{ maxWidth: 1040, mx: "auto", position: "relative" }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 5,
            overflow: "hidden",
            minHeight: 700,
            display: "flex",
            flexDirection: "column",
            background: "#f8fbff",
            border: "1px solid rgba(37,99,235,0.2)",
            boxShadow: "0 35px 65px -30px rgba(15,23,42,0.75)",
          }}
        >
          <Box
            sx={{
              px: { xs: 2.5, md: 4 },
              py: { xs: 2.5, md: 3 },
              background: "linear-gradient(120deg, rgba(37,99,235,0.95), rgba(14,165,233,0.9))",
              color: "#fff",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                <Tooltip title="Quay lại">
                  <IconButton onClick={() => navigate(-1)} sx={{ color: "#e0f2fe" }}>
                    <ArrowBackRoundedIcon />
                  </IconButton>
                </Tooltip>
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.22)", color: "#fff", width: 54, height: 54, fontSize: 18 }}>
                  {(convId ?? "C").slice(0, 2).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Cuộc trò chuyện #{convId?.slice(0, 6) ?? "---"}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#dbeafe", fontSize: 14 }}>
                    <ScheduleRoundedIcon fontSize="small" />
                    <span>{messages.length} tin nhắn đã trao đổi</span>
                    <Box component="span" sx={{ width: 4, height: 4, borderRadius: 1, backgroundColor: "#e0f2fe" }} />
                    <span>Trạng thái: realtime</span>
                  </Stack>
                </Box>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<VideoCallOutlinedIcon />}
                  sx={{
                    color: "#e0f2fe",
                    borderColor: "rgba(255,255,255,0.45)",
                    textTransform: "none",
                  }}
                >
                  Video call
                </Button>
                <Button
                  variant="contained"
                  startIcon={<MoreVertRoundedIcon />}
                  sx={{
                    backgroundColor: "#1d4ed8",
                    textTransform: "none",
                    boxShadow: "0 10px 30px rgba(15,23,42,0.45)",
                  }}
                >
                  Tùy chọn nhanh
                </Button>
              </Stack>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={3}>
              {[
                { label: "Người phụ trách", value: getSenderName(messages[0]?.senderId) || "Ẩn danh" },
                { label: "Độ ưu tiên", value: messages.length > 15 ? "Cao" : "Chuẩn" },
                { label: "Kênh", value: "QQ Chat" },
              ].map((stat) => (
                <Box
                  key={stat.label}
                  sx={{
                    flex: 1,
                    backgroundColor: "rgba(15,23,42,0.35)",
                    borderRadius: 3,
                    px: 2.5,
                    py: 1.5,
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#bfdbfe", letterSpacing: 1 }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, md: 4 }, py: 4 }}>
            <Stack spacing={2.5}>
              {groupedMessages.map((item) => {
                if (item.type === "date") {
                  return (
                    <Stack key={item.id} direction="row" alignItems="center" spacing={1.5}>
                      <Divider sx={{ flex: 1, borderColor: "rgba(37,99,235,0.2)" }} />
                      <Typography variant="caption" sx={{ color: "#1d4ed8", fontWeight: 600 }}>
                        {item.label}
                      </Typography>
                      <Divider sx={{ flex: 1, borderColor: "rgba(37,99,235,0.2)" }} />
                    </Stack>
                  );
                }
                const m = item.payload;
                const mine = isMine(m.senderId);
                return (
                  <Stack key={m.localId} alignItems={mine ? "flex-end" : "flex-start"} spacing={0.5}
                    sx={{
                      transition: "transform .2s",
                      "&:hover": { transform: "translateY(-2px)" },
                    }}
                  >
                    <Typography variant="caption" sx={{ color: mine ? "#0ea5e9" : "#475569" }}>
                      {mine ? "Bạn" : getSenderName(m.senderId)}
                    </Typography>
                    <Box
                      sx={{
                        px: 2.5,
                        py: 1.75,
                        borderRadius: mine ? "28px 4px 24px 28px" : "4px 28px 28px 24px",
                        maxWidth: "78%",
                        background: mine
                          ? "linear-gradient(120deg, #1d4ed8, #0ea5e9)"
                          : "#ffffff",
                        border: mine ? "none" : "1px solid rgba(37,99,235,0.15)",
                        color: mine ? "#fff" : "#0f172a",
                        boxShadow: mine
                          ? "0 12px 30px rgba(37,99,235,0.35)"
                          : "0 10px 30px rgba(15,23,42,0.08)",
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                        {m.text}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })}
              <div ref={messagesRef} />
            </Stack>
          </Box>

          <Divider sx={{ borderColor: "rgba(37,99,235,0.1)" }} />
          <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {[
                  "Gửi tệp báo giá",
                  "Lên lịch gọi",
                  "Đề xuất combo",
                ].map((chip) => (
                  <Button
                    key={chip}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: "rgba(37,99,235,0.25)",
                      color: "#1d4ed8",
                      textTransform: "none",
                    }}
                  >
                    {chip}
                  </Button>
                ))}
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="center">
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Emoji">
                    <IconButton sx={{ color: "#60a5fa" }}>
                      <EmojiEmotionsOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ảnh nhanh">
                    <IconButton sx={{ color: "#60a5fa" }}>
                      <InsertPhotoRoundedIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Đính kèm">
                    <IconButton sx={{ color: "#60a5fa" }}>
                      <AttachFileRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <TextField
                  fullWidth
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  multiline
                  maxRows={4}
                  sx={{
                    background: "rgba(59,130,246,0.08)",
                    borderRadius: 3,
                    fieldset: { borderColor: "rgba(37,99,235,0.35)" },
                    textarea: { color: "#0f172a" },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSend}
                  endIcon={<SendRoundedIcon />}
                  sx={{
                    background: "linear-gradient(120deg, #2563eb, #0ea5e9)",
                    textTransform: "none",
                    px: 5,
                    fontWeight: 700,
                    alignSelf: { xs: "stretch", md: "auto" },
                    boxShadow: "0 12px 35px -10px rgba(37,99,235,0.5)",
                  }}
                >
                  Gửi ngay
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
