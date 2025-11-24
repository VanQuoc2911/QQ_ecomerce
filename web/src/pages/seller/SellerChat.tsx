import { Box, Button, Divider, List, ListItem, ListItemButton, ListItemText, Paper, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useRef, useState } from "react";
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
  const { socket } = useSocket();
  const messagesRef = useRef<HTMLDivElement | null>(null);

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
    <Box p={3}>
      <Typography variant="h5" mb={2}>Trò chuyện với khách hàng</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, maxHeight: 600, overflow: 'auto' }} elevation={0}>
            <Typography variant="subtitle1" mb={1}>Cuộc trò chuyện</Typography>
            <List>
              {conversations.map((c) => (
                  <ListItem key={c._id} disablePadding>
                    <ListItemButton onClick={() => loadMessages(c._id)} selected={selectedConv === c._id}>
                  <ListItemText
                    primary={(() => {
                      // try to show the other participant's name (not current user)
                      const myId = user ? (user._id ?? String(user.id)) : undefined;
                      const other = c.participants?.find((p) => p._id !== myId) || c.participants?.[0];
                      return other?.name || other?._id || 'Người dùng';
                    })()}
                    secondary={c.lastMessage || '---'}
                  />
                    </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 600, display: 'flex', flexDirection: 'column' }} elevation={0}>
            <Box sx={{ flex: 1, overflow: 'auto', mb: 1 }}>
              {messages.map((m, i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{typeof m.senderId === 'string' ? m.senderId : (m.senderId?.name || (m.senderId as Participant)?._id)}</Typography>
                  <Typography sx={{ background: '#f0f2f5', display: 'inline-block', p: 1, borderRadius: 1 }}>{m.text}</Typography>
                </Box>
              ))}
              <div ref={messagesRef} />
            </Box>

            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField fullWidth value={text} onChange={(e) => setText(e.target.value)} placeholder="Gửi tin nhắn tới khách hàng..." />
              <Button variant="contained" onClick={handleSend}>Gửi</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
