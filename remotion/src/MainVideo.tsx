import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Background } from "./components/Background";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2QR } from "./scenes/Scene2QR";
import { Scene3Choose } from "./scenes/Scene3Choose";
import { Scene4Cart } from "./scenes/Scene4Cart";
import { Scene5Whatsapp } from "./scenes/Scene5Whatsapp";
import { COLORS, FONT } from "./theme";

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily: FONT }}>
      <Background />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene2QR />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene3Choose />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4Cart />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene5Whatsapp />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
