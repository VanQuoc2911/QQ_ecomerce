import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/useSocket";
import type { Conversation, Message, Participant } from "../../types/chat";

export default function SellerChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { socket } = useSocket();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const myId = user ? (user._id ?? String(user.id)) : undefined;

  const loadConversations = async () => {
    try {
      const { data } = await api.get<Conversation[]>('/api/chat');
      setConversations(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data } = await api.get<Message[]>(`/api/chat/${convId}/messages`);
      setMessages(data || []);
      // join socket room for real-time updates
      if (socket) socket.emit('joinChat', { convId });
      setSelectedConv(convId);
      setTimeout(() => messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!selectedConv || !text.trim()) return;
    try {
      const { data } = await api.post<Message>('/api/chat/messages', { convId: selectedConv, text });
      setMessages((m) => [...m, data]);
      setText("");
      setTimeout(() => messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const keyword = searchTerm.toLowerCase();
    return conversations.filter((c) => {
      const other = c.participants?.find((p) => p._id !== myId) || c.participants?.[0];
      const name = other?.name || other?._id || "";
      return name.toLowerCase().includes(keyword) || (c.lastMessage ?? "").toLowerCase().includes(keyword);
    });
  }, [conversations, searchTerm, myId]);

  const currentConversation = useMemo(
    () => conversations.find((c) => c._id === selectedConv),
    [conversations, selectedConv]
  );

  const getParticipantDisplay = (conversation?: Conversation) => {
    if (!conversation) return "Chưa chọn";
    const other = conversation.participants?.find((p) => p._id !== myId) || conversation.participants?.[0];
    return other?.name || other?._id || "Người dùng";
  };

  useEffect(() => {
    if (!socket) return;
    const onMessage = (payload: { convId?: string; message?: Message }) => {
      if (!payload || !payload.convId) return;
      // If currently viewing this conversation, append message
      if (payload.convId === selectedConv) {
        if (payload.message) setMessages((m) => {
          // payload.message is defined here; append safely
          return [...m, payload.message as Message];
        });
        setTimeout(() => messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
      } else {
        // otherwise refresh conversation list to update lastMessage
        loadConversations();
      }
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:message:personal', onMessage);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:message:personal', onMessage);
    };
  }, [socket, selectedConv]);

  return (
        <Box
          sx={{
            minHeight: "100vh",
            background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 40%, #ffffff 95%)",
            py: { xs: 3, md: 5 },
            px: { xs: 1.5, md: 4 },
          }}
        >
          <Box sx={{ maxWidth: 1280, mx: "auto" }}>
            <Stack spacing={3}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 4,
                  background: "linear-gradient(120deg, rgba(37,99,235,0.95), rgba(14,165,233,0.9))",
                  color: "#fff",
                  boxShadow: "0 35px 80px -40px rgba(15,23,42,0.8)",
                }}
              >
                <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems={{ lg: "center" }}>
                  <Stack spacing={1} flex={1}>
                    <Typography variant="overline" sx={{ letterSpacing: 2, color: "#bfdbfe" }}>
                      Trung tâm hỗ trợ
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      Trò chuyện cùng khách hàng theo thời gian thực
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#e0f2fe" }}>
                      Theo dõi, ưu tiên và phản hồi các cuộc trò chuyện ngay lập tức với bảng điều khiển trò chuyện mới hoàn toàn.
                    </Typography>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      variant="outlined"
                      startIcon={<FilterListRoundedIcon />}
                      sx={{ color: "#e0f2fe", borderColor: "rgba(255,255,255,0.5)", textTransform: "none" }}
                    >
                      Bộ lọc thông minh
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SupportAgentRoundedIcon />}
                      sx={{
                        backgroundColor: "#1d4ed8",
                        textTransform: "none",
                        px: 3,
                        fontWeight: 600,
                        boxShadow: "0 18px 45px -20px rgba(15,23,42,0.8)",
                      }}
                    >
                      Tạo hội thoại mới
                    </Button>
                  </Stack>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} mt={4}>
                  {[
                    { label: "Tổng hội thoại", value: conversations.length },
                    { label: "Đang mở", value: filteredConversations.length },
                    { label: "Tin nhắn đã chọn", value: messages.length },
                  ].map((stat) => (
                    <Box
                      key={stat.label}
                      sx={{
                        flex: 1,
                        backgroundColor: "rgba(15,23,42,0.35)",
                        borderRadius: 3,
                        px: 3,
                        py: 1.75,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#bfdbfe", letterSpacing: 1 }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 2.5, md: 3 },
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.95)",
                      border: "1px solid rgba(37,99,235,0.15)",
                      height: "100%",
                    }}
                  >
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: "#2563eb", fontWeight: 700 }}>
                          Cuộc trò chuyện
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#475569" }}>
                          Chọn khách hàng để xem lịch sử và phản hồi.
                        </Typography>
                      </Box>
                      <TextField
                        placeholder="Tìm kiếm theo tên hoặc nội dung..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchRoundedIcon sx={{ color: "#60a5fa" }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          background: "#f8fafc",
                          borderRadius: 3,
                          fieldset: { borderColor: "rgba(37,99,235,0.2)" },
                        }}
                      />
                      <List sx={{ maxHeight: 520, overflow: "auto", pr: 1 }}>
                        {filteredConversations.length === 0 ? (
                          <Stack spacing={1.5} alignItems="center" py={6}>
                            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 48, color: "#94a3b8" }} />
                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                              Không tìm thấy cuộc trò chuyện nào.
                            </Typography>
                          </Stack>
                        ) : (
                          filteredConversations.map((c) => {
                            const other = c.participants?.find((p) => p._id !== myId) || c.participants?.[0];
                            return (
                              <ListItem key={c._id} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                  onClick={() => loadMessages(c._id)}
                                  selected={selectedConv === c._id}
                                  sx={{
                                    borderRadius: 3,
                                    alignItems: "flex-start",
                                    backgroundColor:
                                      selectedConv === c._id ? "rgba(37,99,235,0.08)" : "transparent",
                                    border: selectedConv === c._id ? "1px solid rgba(37,99,235,0.2)" : "1px solid transparent",
                                  }}
                                >
                                  <Avatar sx={{ width: 44, height: 44, mr: 2, bgcolor: "#dbeafe", color: "#1d4ed8" }}>
                                    {(other?.name || other?._id || "KH").slice(0, 2).toUpperCase()}
                                  </Avatar>
                                  <ListItemText
                                    primary={
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="subtitle2" sx={{ color: "#0f172a", fontWeight: 600 }}>
                                          {other?.name || other?._id || "Người dùng"}
                                        </Typography>
                                        <Chip
                                          label={c.lastMessage ? "Đang hoạt động" : "Chờ phản hồi"}
                                          size="small"
                                          sx={{
                                            backgroundColor: c.lastMessage ? "rgba(16,185,129,0.15)" : "rgba(251,191,36,0.18)",
                                            color: c.lastMessage ? "#059669" : "#b45309",
                                          }}
                                        />
                                      </Stack>
                                    }
                                    secondary={
                                      <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
                                        {c.lastMessage || "Chưa có tin nhắn"}
                                      </Typography>
                                    }
                                  />
                                </ListItemButton>
                              </ListItem>
                            );
                          })
                        )}
                      </List>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 0,
                      height: "100%",
                      minHeight: 640,
                      borderRadius: 4,
                      overflow: "hidden",
                      border: "1px solid rgba(37,99,235,0.15)",
                      display: "flex",
                      flexDirection: "column",
                      background: "#fdfdfd",
                    }}
                  >
                    <Box sx={{
                      px: { xs: 2.5, md: 4 },
                      py: 3,
                      background: "linear-gradient(120deg, rgba(37,99,235,0.9), rgba(59,130,246,0.85))",
                      color: "#fff",
                    }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                        <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", width: 56, height: 56 }}>
                          {selectedConv ? getParticipantDisplay(currentConversation).slice(0, 2).toUpperCase() : "--"}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {selectedConv ? getParticipantDisplay(currentConversation) : "Chọn cuộc trò chuyện"}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#dbeafe" }}>
                            {selectedConv
                              ? `${messages.length} tin nhắn • cập nhật tức thời`
                              : "Vui lòng chọn một cuộc trò chuyện ở danh sách bên trái"}
                          </Typography>
                        </Box>
                        <Tooltip title="Làm mới hội thoại">
                          <IconButton onClick={() => selectedConv && loadMessages(selectedConv)} sx={{ color: "#e0f2fe" }}>
                            <FilterListRoundedIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>

                    <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, md: 4 }, py: 3 }}>
                      {selectedConv ? (
                        <Stack spacing={2}>
                          {messages.map((m, i) => {
                            const mine = (typeof m.senderId === "string" ? m.senderId : m.senderId?._id) === myId;
                            return (
                              <Stack key={`${m._id ?? i}-${i}`} alignItems={mine ? "flex-end" : "flex-start"} spacing={0.5}>
                                <Typography variant="caption" sx={{ color: mine ? "#0ea5e9" : "#475569" }}>
                                  {mine ? "Bạn" : typeof m.senderId === "string" ? m.senderId : (m.senderId?.name || (m.senderId as Participant)?._id)}
                                </Typography>
                                <Box
                                  sx={{
                                    px: 2.5,
                                    py: 1.5,
                                    borderRadius: mine ? "24px 6px 24px 24px" : "6px 24px 24px 24px",
                                    maxWidth: "80%",
                                    background: mine
                                      ? "linear-gradient(120deg, #2563eb, #0ea5e9)"
                                      : "#ffffff",
                                    color: mine ? "#fff" : "#0f172a",
                                    border: mine ? "none" : "1px solid rgba(148,163,184,0.4)",
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
                      ) : (
                        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: "100%", color: "#94a3b8" }}>
                          <SupportAgentRoundedIcon sx={{ fontSize: 72 }} />
                          <Typography variant="h6" sx={{ color: "#475569" }}>
                            Chọn một cuộc trò chuyện
                          </Typography>
                          <Typography variant="body2" textAlign="center">
                            Sử dụng danh sách bên trái để duyệt và mở các cuộc trò chuyện với khách hàng.
                          </Typography>
                        </Stack>
                      )}
                    </Box>

                    <Divider sx={{ borderColor: "rgba(37,99,235,0.15)" }} />
                    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {["Đính kèm báo giá", "Hỏi thông tin giao hàng", "Đề xuất ưu đãi"].map((action) => (
                            <Button
                              key={action}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: "rgba(37,99,235,0.3)",
                                color: "#2563eb",
                                textTransform: "none",
                              }}
                            >
                              {action}
                            </Button>
                          ))}
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="center">
                          <TextField
                            fullWidth
                            disabled={!selectedConv}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                              }
                            }}
                            placeholder={selectedConv ? "Nhập tin nhắn tới khách hàng..." : "Chọn cuộc trò chuyện để bắt đầu"}
                            multiline
                            maxRows={4}
                            sx={{
                              background: "rgba(148,163,184,0.1)",
                              borderRadius: 3,
                              fieldset: { borderColor: "rgba(37,99,235,0.25)" },
                              textarea: { color: "#0f172a" },
                            }}
                          />
                          <Button
                            variant="contained"
                            disabled={!selectedConv}
                            onClick={handleSend}
                            endIcon={<SendRoundedIcon />}
                            sx={{
                              background: "linear-gradient(120deg, #2563eb, #0ea5e9)",
                              textTransform: "none",
                              px: 5,
                              fontWeight: 700,
                              alignSelf: { xs: "stretch", md: "auto" },
                            }}
                          >
                            Gửi ngay
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Stack>
          </Box>
        </Box>
  );
}
