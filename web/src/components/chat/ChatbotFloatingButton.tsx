import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import {
    Box,
    ClickAwayListener,
    Fab,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChatbotPopup from "./ChatbotPopup";

const floatAnim = keyframes`
  0% { transform: translateY(0); box-shadow: 0 12px 24px rgba(16, 24, 40, 0.18); }
  50% { transform: translateY(-8px); box-shadow: 0 24px 35px rgba(16, 24, 40, 0.28); }
  100% { transform: translateY(0); box-shadow: 0 12px 24px rgba(16, 24, 40, 0.18); }
`;

const pulseAnim = keyframes`
  0% { transform: scale(1); opacity: 0.55; }
  80% { transform: scale(1.45); opacity: 0; }
  100% { transform: scale(1.45); opacity: 0; }
`;

export default function ChatbotFloatingButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname || "";
  const [open, setOpen] = useState(false);

  const shouldHide = useMemo(() => {
    if (!pathname) return false;
    if (pathname.startsWith("/admin")) return true;
    if (pathname.startsWith("/seller")) return true;
    if (pathname.startsWith("/ai-chat")) return true;
    if (pathname.startsWith("/chat")) return true;
    return false;
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (shouldHide) return null;

  const handleClick = () => {
    setOpen((prev) => !prev);
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box
        sx={{
          position: "fixed",
          bottom: { xs: 20, md: 32 },
          right: { xs: 18, md: 36 },
          zIndex: 2000,
          pointerEvents: "auto",
          transition: "transform 0.3s ease, opacity 0.3s ease",
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
          <Box
            sx={{
              mb: 2,
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(10px)",
              pointerEvents: open ? "auto" : "none",
              transition: "opacity 0.25s ease, transform 0.25s ease",
              display: open ? "block" : "none",
            }}
          >
            {open && (
              <ChatbotPopup
                onClose={() => setOpen(false)}
                onOpenFull={() => {
                  setOpen(false);
                  navigate("/ai-chat");
                }}
              />
            )}
          </Box>

          <Box
            sx={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "linear-gradient(120deg, rgba(103,80,235,0.25), rgba(118,75,162,0.1))",
              animation: `${pulseAnim} 2.6s infinite`,
              zIndex: -1,
            }}
          />
          <Tooltip title={open ? "Thu nhỏ" : "Hỏi trợ lý AI"} placement="left">
            <Fab
              color="primary"
              onClick={handleClick}
              sx={{
                width: 64,
                height: 64,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                animation: `${floatAnim} 3.4s ease-in-out infinite`,
              }}
            >
              <SmartToyIcon fontSize="large" />
            </Fab>
          </Tooltip>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              mt: 1,
              px: 2,
              py: 1,
              borderRadius: 999,
              background: "rgba(15,23,42,0.85)",
              color: "#fff",
              boxShadow: "0 10px 30px rgba(15,23,42,0.35)",
            }}
          >
            <ChatBubbleOutlineIcon fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              Chatbot AI
            </Typography>
          </Stack>
        </Box>
    </ClickAwayListener>
  );
}
