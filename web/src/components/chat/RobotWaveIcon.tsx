import { Box } from "@mui/material";
import robotWaveSvg from "../../assets/robot-wave.svg";

type Props = {
  size?: number;
  animated?: boolean;
  shadow?: boolean;
};

export default function RobotWaveIcon({ size = 40, animated = true, shadow = true }: Props) {
  return (
    <Box
      component="img"
      src={robotWaveSvg}
      alt="QQ AI robot waving"
      draggable={false}
      sx={{
        width: size,
        height: size,
        display: "block",
        pointerEvents: "none",
        filter: shadow ? "drop-shadow(0 6px 14px rgba(79,70,229,0.35))" : "none",
        animation: animated ? "qqRobotWave 3.2s ease-in-out infinite" : "none",
        transformOrigin: "80% 20%",
        "@keyframes qqRobotWave": {
          "0%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(8deg)" },
          "40%": { transform: "rotate(-6deg)" },
          "60%": { transform: "rotate(6deg)" },
          "80%": { transform: "rotate(-4deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
      }}
    />
  );
}
