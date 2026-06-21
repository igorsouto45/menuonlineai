import { loadFont as loadDisplay } from "@remotion/google-fonts/PlusJakartaSans";

const display = loadDisplay("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

export const FONT = display.fontFamily;

export const COLORS = {
  bg: "#1a0f0a",
  bgSoft: "#2a1810",
  cream: "#fdf6ed",
  coral: "#e85d3a",
  amber: "#f7931e",
  gold: "#f5c14a",
  ink: "#1a0f0a",
  muted: "#8a7466",
};
