import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eyebrow = spring({ frame: frame - 5, fps, config: { damping: 18 } });
  const title = spring({ frame: frame - 15, fps, config: { damping: 16, stiffness: 110 } });
  const sub = spring({ frame: frame - 40, fps, config: { damping: 20 } });
  const float = Math.sin(frame / 18) * 6;

  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center" }}>
      <div style={{ transform: `translateY(${float}px)` }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 26px",
            border: `2px solid ${COLORS.coral}`,
            borderRadius: 999,
            color: COLORS.cream,
            fontSize: 30,
            fontWeight: 600,
            opacity: eyebrow,
            transform: `translateX(${interpolate(eyebrow, [0, 1], [-30, 0])}px)`,
            marginBottom: 40,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: COLORS.coral }} />
          TUTORIAL RÁPIDO
        </div>
        <h1
          style={{
            fontSize: 160,
            lineHeight: 0.92,
            fontWeight: 800,
            color: COLORS.cream,
            margin: 0,
            letterSpacing: -4,
            opacity: title,
            transform: `translateY(${interpolate(title, [0, 1], [60, 0])}px)`,
          }}
        >
          Como usar<br />
          o <span style={{ color: COLORS.coral }}>cardápio</span><br />
          digital
        </h1>
        <p
          style={{
            marginTop: 50,
            color: COLORS.muted,
            fontSize: 42,
            fontWeight: 500,
            maxWidth: 780,
            opacity: sub,
            transform: `translateY(${interpolate(sub, [0, 1], [30, 0])}px)`,
          }}
        >
          Em 4 passos simples, do QR Code até o pedido pronto.
        </p>
      </div>
    </AbsoluteFill>
  );
};
