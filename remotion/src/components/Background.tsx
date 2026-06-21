import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

export const Background = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const x = Math.sin(t * Math.PI * 2) * 80;
  const y = Math.cos(t * Math.PI * 2) * 60;
  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(60% 40% at ${50 + x / 10}% ${30 + y / 10}%, ${COLORS.coral}55, transparent 70%),
                      radial-gradient(50% 35% at ${30 - x / 12}% ${80 + y / 12}%, ${COLORS.amber}33, transparent 70%),
                      linear-gradient(180deg, ${COLORS.bg} 0%, ${COLORS.bgSoft} 100%)`,
        }}
      />
      {/* subtle grain via repeating gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 3px)",
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
