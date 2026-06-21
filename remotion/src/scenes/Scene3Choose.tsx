import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { COLORS } from "../theme";

const ProductCard = ({ delay, emoji, name, price }: { delay: number; emoji: string; name: string; price: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const pulse = Math.sin((frame - delay) / 12) * 4;
  return (
    <div
      style={{
        background: COLORS.cream,
        borderRadius: 36,
        padding: 36,
        display: "flex",
        alignItems: "center",
        gap: 30,
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        opacity: a,
        transform: `translateX(${interpolate(a, [0, 1], [120, 0])}px) translateY(${pulse}px)`,
      }}
    >
      <div style={{
        width: 140, height: 140, borderRadius: 28,
        background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.coral})`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80,
      }}>{emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.ink }}>{name}</div>
        <div style={{ fontSize: 32, color: COLORS.muted, marginTop: 6 }}>{price}</div>
      </div>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: COLORS.coral, color: COLORS.cream,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 56, fontWeight: 700,
      }}>+</div>
    </div>
  );
};

export const Scene3Choose = () => {
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "flex-start", gap: 50 }}>
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 30 }}>
          <div style={{
            width: 110, height: 110, borderRadius: 28, background: COLORS.coral,
            color: COLORS.cream, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 64, fontWeight: 800,
          }}>2</div>
          <div style={{ fontSize: 32, color: COLORS.muted, fontWeight: 600, letterSpacing: 2 }}>PASSO 2</div>
        </div>
        <h2 style={{ fontSize: 100, lineHeight: 1, color: COLORS.cream, margin: 0, fontWeight: 800, letterSpacing: -3 }}>
          Escolha seus<br />pratos favoritos.
        </h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 30 }}>
        <ProductCard delay={20} emoji="🍔" name="Burger Clássico" price="R$ 32,90" />
        <ProductCard delay={45} emoji="🍟" name="Batata Crocante" price="R$ 18,00" />
        <ProductCard delay={70} emoji="🥤" name="Refri Gelado" price="R$ 8,50" />
      </div>
    </AbsoluteFill>
  );
};
