import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const SHOW_DURATION = 800;

const dots = Array.from({ length: 12 });

export default function PageLoadingOverlay() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setVisible(true);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setVisible(false), SHOW_DURATION);
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [location.key]);

  useEffect(() => {
    timeoutRef.current = window.setTimeout(() => setVisible(false), SHOW_DURATION);
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, rgba(59,130,246,0.35), rgba(15,23,42,0.9))",
        backdropFilter: "blur(10px)",
      }}
    >
      <Box
        sx={{
          width: 220,
          height: 220,
          borderRadius: "24px",
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(148,163,184,0.2)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(14,165,233,0.05))",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 2,
            color: "#e2e8f0",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: 120,
              height: 120,
            }}
          >
            {dots.map((_, index) => {
              const delay = (index / dots.length) * 0.9;
              const size = 8 + ((index % 4) + 1);
              return (
                <Box
                  key={index}
                  sx={{
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    top: "50%",
                    left: "50%",
                    marginTop: `-${size / 2}px`,
                    marginLeft: `-${size / 2}px`,
                    background: "linear-gradient(120deg, #38bdf8, #a5b4fc)",
                    animation: `orbit 1.6s linear infinite` ,
                    animationDelay: `${delay}s`,
                    transformOrigin: "0 -40px",
                  }}
                />
              );
            })}

            <Box
              sx={{
                position: "absolute",
                inset: 10,
                borderRadius: "50%",
                border: "1px dashed rgba(148,163,184,0.4)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 28,
                borderRadius: "50%",
                border: "1px dashed rgba(59,130,246,0.4)",
              }}
            />
          </Box>

          <Box sx={{ fontSize: 18, fontWeight: 600 }}>
            Đang tải trang...
          </Box>
          <Box
            sx={{
              width: "70%",
              height: 6,
              background: "rgba(148,163,184,0.3)",
              borderRadius: 999,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)",
                animation: "shimmer 1.4s ease-in-out infinite",
              }}
            />
          </Box>
        </Box>
      </Box>

      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateY(-40px) rotate(0deg); }
          to { transform: rotate(360deg) translateY(-40px) rotate(-360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Box>
  );
}
