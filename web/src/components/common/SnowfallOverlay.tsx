import Box from "@mui/material/Box";
import GlobalStyles from "@mui/material/GlobalStyles";
import { memo, useMemo } from "react";

interface SnowflakeConfig {
  key: string;
  left: string;
  delay: string;
  duration: string;
  size: string;
  blur: string;
  opacity: number;
}

interface SnowfallOverlayProps {
  count?: number;
}

function SnowfallOverlay({ count = 30 }: SnowfallOverlayProps) {
  const flakes = useMemo<SnowflakeConfig[]>(
    () =>
      Array.from({ length: count }, (_, idx) => ({
        key: `snowflake-${idx}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${6 + Math.random() * 6}s`,
        size: `${6 + Math.random() * 10}px`,
        blur: `${Math.random() * 4}px`,
        opacity: 0.35 + Math.random() * 0.45,
      })),
    [count]
  );

  return (
    <>
      <GlobalStyles
        styles={{
          "@keyframes snowfall": {
            "0%": { transform: "translate3d(0, -10%, 0)" },
            "100%": { transform: "translate3d(0, 110vh, 0)" },
          },
        }}
      />
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 10,
          mixBlendMode: "screen",
        }}
      >
        {flakes.map((flake) => (
          <Box
            key={flake.key}
            component="span"
            sx={{
              position: "absolute",
              top: "-10%",
              left: flake.left,
              width: flake.size,
              height: flake.size,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.95)",
              opacity: flake.opacity,
              filter: `blur(${flake.blur})`,
              animation: `snowfall ${flake.duration} linear infinite`,
              animationDelay: flake.delay,
              boxShadow: "0 0 8px rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </Box>
    </>
  );
}

export default memo(SnowfallOverlay);
