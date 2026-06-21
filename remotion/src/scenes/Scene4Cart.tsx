import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";

export const Scene4Cart = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cartIn = spring({ frame: frame - 25, fps, config: { damping: 12 } });
  const countPop = spring({ frame: frame - 55, fps, config: { damping: 8, stiffness: 200 } });
  const totalIn = spring({ frame: frame - 80, fps, config: { damping: 16 } });

  // counter 0->3
  const count = Math.min(3, Math.floor(interpolate(frame - 55, [0, 30], [0, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));

  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "flex-start" }}>
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 30 }}>
          <div style={{
            width: 110, height: 110, borderRadius: 28, background: COLORS.coral,
            color: COLORS.cream, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 64, fontWeight: 800,
          }}>3</div>
          <div style={{ fontSize: 32, color: COLORS.muted, fontWeight: 600, letterSpacing: 2 }}>PASSO 3</div>
        </div>
        <h2 style={{ fontSize: 100, lineHeight: 1, color: COLORS.cream, margin: 0, fontWeight: 800, letterSpacing: -3 }}>
          Adicione ao<br />carrinho.
        </h2>
      </div>

      {/* Floating cart */}
      <div style={{
        marginTop: 100,
        alignSelf: "center",
        transform: `scale(${interpolate(cartIn, [0, 1], [0.5, 1])})`,
        opacity: cartIn,
        position: "relative",
      }}>
        <div style={{
          width: 380, height: 380, borderRadius: 100,
          background: `linear-gradient(135deg, ${COLORS.coral}, ${COLORS.amber})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 220, boxShadow: `0 40px 80px ${COLORS.coral}55`,
        }}>🛒</div>
        <div style={{
          position: "absolute", top: -20, right: -20,
          width: 140, height: 140, borderRadius: 999,
          background: COLORS.cream, color: COLORS.coral,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 80, fontWeight: 800,
          transform: `scale(${countPop})`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}>{count}</div>
      </div>

      <div style={{
        marginTop: 80,
        alignSelf: "center",
        background: COLORS.cream, color: COLORS.ink,
        padding: "30px 60px", borderRadius: 30,
        fontSize: 48, fontWeight: 700,
        opacity: totalIn,
        transform: `translateY(${interpolate(totalIn, [0, 1], [40, 0])}px)`,
      }}>
        Total: <span style={{ color: COLORS.coral }}>R$ 59,40</span>
      </div>
    </AbsoluteFill>
  );
};
