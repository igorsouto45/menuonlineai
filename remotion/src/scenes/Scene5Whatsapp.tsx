import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";

const Bubble = ({ delay, text, side }: { delay: number; text: string; side: "left" | "right" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  const isUser = side === "right";
  return (
    <div style={{
      alignSelf: isUser ? "flex-end" : "flex-start",
      maxWidth: "75%",
      background: isUser ? "#dcf8c6" : COLORS.cream,
      color: COLORS.ink,
      padding: "22px 30px",
      borderRadius: 28,
      borderBottomRightRadius: isUser ? 6 : 28,
      borderBottomLeftRadius: isUser ? 28 : 6,
      fontSize: 32, fontWeight: 500,
      whiteSpace: "pre-line",
      opacity: a,
      transform: `translateY(${interpolate(a, [0, 1], [20, 0])}px)`,
      boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
    }}>{text}</div>
  );
};

export const Scene5Whatsapp = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerIn = spring({ frame, fps, config: { damping: 18 } });
  const check = spring({ frame: frame - 110, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "flex-start" }}>
      <div style={{ marginTop: 40, opacity: headerIn }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 30 }}>
          <div style={{
            width: 110, height: 110, borderRadius: 28, background: "#25D366",
            color: COLORS.cream, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 64, fontWeight: 800,
          }}>4</div>
          <div style={{ fontSize: 32, color: COLORS.muted, fontWeight: 600, letterSpacing: 2 }}>PASSO 4</div>
        </div>
        <h2 style={{ fontSize: 100, lineHeight: 1, color: COLORS.cream, margin: 0, fontWeight: 800, letterSpacing: -3 }}>
          Envie pelo<br /><span style={{ color: "#25D366" }}>WhatsApp.</span>
        </h2>
      </div>

      <div style={{
        marginTop: 60,
        background: "rgba(0,0,0,0.35)",
        borderRadius: 40,
        padding: 40,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        <Bubble delay={25} side="right" text="Olá! Quero fazer um pedido 🍔" />
        <Bubble delay={50} side="left" text="Claro! Recebemos seu pedido:" />
        <Bubble delay={70} side="left" text="• 1x Burger Clássico
• 1x Batata Crocante
• 1x Refri Gelado" />
        <Bubble delay={95} side="left" text="Total: R$ 59,40 ✅" />
      </div>

      <div style={{
        marginTop: 60, alignSelf: "center",
        display: "flex", alignItems: "center", gap: 20,
        background: "#25D366", color: COLORS.cream,
        padding: "30px 50px", borderRadius: 999,
        fontSize: 44, fontWeight: 700,
        opacity: check,
        transform: `scale(${interpolate(check, [0, 1], [0.7, 1])})`,
        boxShadow: "0 20px 50px rgba(37,211,102,0.5)",
      }}>
        ✓ Pedido confirmado
      </div>
    </AbsoluteFill>
  );
};
