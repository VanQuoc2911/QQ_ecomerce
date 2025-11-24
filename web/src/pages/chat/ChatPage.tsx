import { Box, Button, Divider, Paper, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/useSocket";
import type { Message, Participant } from "../../types/chat";

export default function ChatPage() {
  const { convId } = useParams<{ convId: string }>();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!convId) return;
    const load = async () => {
      try {
        const { data } = await api.get<Message[]>(`/api/chat/${convId}/messages`);
        setMessages(data || []);
        // join room
        if (socket) socket.emit('joinChat', { convId });
        setTimeout(() => messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
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
      setTimeout(() => messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
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
          setTimeout(() => messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
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

  if (!user) {
    // simple guard: redirect to home and open login
    window.dispatchEvent(new Event('openLogin'));
    navigate('/home');
    return null;
  }

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>Trò chuyện</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={12}>
          <Paper sx={{ p: 2, height: 600, display: 'flex', flexDirection: 'column' }} elevation={0}>
            <Box sx={{ flex: 1, overflow: 'auto', mb: 1 }}>
              {messages.map((m, i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{typeof m.senderId === 'string' ? m.senderId : ((m.senderId as Participant).name || (m.senderId as Participant)._id)}</Typography>
                  <Typography sx={{ background: '#f0f2f5', display: 'inline-block', p: 1, borderRadius: 1 }}>{m.text}</Typography>
                </Box>
              ))}
              <div ref={messagesRef} />
            </Box>

            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField fullWidth value={text} onChange={(e) => setText(e.target.value)} placeholder="Gửi tin nhắn..." />
              <Button variant="contained" onClick={handleSend}>Gửi</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
