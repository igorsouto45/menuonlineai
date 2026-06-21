import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";

const StepLabel = ({ n, title }: { n: string; title: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 18 } });
  return (
    <div style={{ opacity: a, transform: `translateY(${interpolate(a, [0, 1], [-20, 0])}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 30 }}>
        <div
          style={{
            width: 110, height: 110, borderRadius: 28,
            background: COLORS.coral, color: COLORS.cream,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 64, fontWeight: 800,
          }}
        >{n}</div>
        <div style={{ fontSize: 32, color: COLORS.muted, fontWeight: 600, letterSpacing: 2 }}>PASSO {n}</div>
      </div>
      <h2 style={{ fontSize: 110, lineHeight: 1, color: COLORS.cream, margin: 0, fontWeight: 800, letterSpacing: -3 }}>
        {title}
      </h2>
    </div>
  );
};

export const Scene2QR = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const qrIn = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 100 } });
  const phoneFloat = Math.sin(frame / 14) * 8;
  const scanLine = interpolate(frame % 60, [0, 60], [0, 100]);

  // generate fake QR matrix
  const cells: boolean[][] = [];
  const SEED = 7;
  for (let r = 0; r < 13; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < 13; c++) {
      const v = Math.sin((r * 13 + c) * SEED) > 0;
      row.push(v);
    }
    cells.push(row);
  }
  const isAnchor = (r: number, c: number) =>
    (r < 4 && c < 4) || (r < 4 && c > 8) || (r > 8 && c < 4);

  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "space-between" }}>
      <div style={{ marginTop: 60 }}>
        <StepLabel n="1" title="Escaneie o QR Code com a câmera." />
      </div>

      <div
        style={{
          alignSelf: "center",
          marginBottom: 120,
          transform: `translateY(${phoneFloat}px) scale(${interpolate(qrIn, [0, 1], [0.6, 1])})`,
          opacity: qrIn,
        }}
      >
        <div
          style={{
            background: COLORS.cream,
            padding: 50,
            borderRadius: 50,
            boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: `repeat(13, 1fr)`, gap: 6 }}>
            {cells.flatMap((row, r) =>
              row.map((v, c) => (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: 40, height: 40, borderRadius: 6,
                    background: isAnchor(r, c) ? COLORS.ink : v ? COLORS.ink : "transparent",
                  }}
                />
              ))
            )}
          </div>
          {/* scan line */}
          <div
            style={{
              position: "absolute",
              left: 30, right: 30,
              top: `${scanLine}%`,
              height: 6,
              background: COLORS.coral,
              boxShadow: `0 0 30px ${COLORS.coral}`,
              borderRadius: 99,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
