import {
  Box,
  ClickAwayListener,
  Fab,
  Tooltip
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChatbotPopup from "./ChatbotPopup";
import RobotWaveIcon from "./RobotWaveIcon";

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
    if (pathname.startsWith("/ai-chat")) return true;
    if (pathname.startsWith("/chat")) return true;
    return false;
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleClick = () => {
    setOpen((prev) => !prev);
  };

  const buttonPositionStyles = {
    right: { xs: 16, md: 32 },
    bottom: { xs: 16, md: 24 },
  } as const;

  if (shouldHide) return null;

  return (
    <ClickAwayListener
      onClickAway={() => {
        if (open) {
          setOpen(false);
        }
      }}
    >
      <Box sx={{ pointerEvents: "none" }}>
        <Box
          sx={{
            position: "fixed",
            right: { xs: 16, md: 32 },
            bottom: { xs: 90, md: 110 },
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            pointerEvents: open ? "auto" : "none",
            zIndex: 2200,
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
            position: "fixed",
            pointerEvents: "auto",
            transition: "transform 0.3s ease, opacity 0.3s ease",
            opacity: 1,
            transform: "translateY(0)",
            cursor: "pointer",
            zIndex: 2100,
            ...buttonPositionStyles,
          }}
        >
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
                cursor: "pointer",
              }}
            >
              <RobotWaveIcon size={40} />
            </Fab>
          </Tooltip>
        </Box>
      </Box>
    </ClickAwayListener>
  );
}
