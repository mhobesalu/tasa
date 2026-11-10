import { Appearance } from "react-native";

// Järv palette (brand sheet, 2 Nov 2026)
const LIGHT = {
  lake: "#2A8C8C",
  lakeInk: "#1D6B6B",
  lakeSoft: "#DDEFEC",
  sun: "#F7B32B",
  sunSoft: "#FDEFC9",
  boat: "#EE6A4D",
  boatInk: "#B4452C",
  boatSoft: "#FBE3DC",
  violetInk: "#5B4BB5",
  violetSoft: "#E9E5FB",
  ink: "#1F2A44",
  muted: "#5B6478",
  line: "#E6E0D2",
  paper: "#FFF7E8",
  card: "#FFFFFF",
  track: "#EDE6D6",
  white: "#FFFFFF",
  /** text on the sun-yellow button: dark in both modes */
  onSun: "#1F2A44",
  /** text on sunSoft tags */
  sunInk: "#7A5300",
};

// Dark: the same Järv colours on a deep lake-night background.
const DARK: typeof LIGHT = {
  lake: "#2E9E9A",
  lakeInk: "#7FD3CF",
  lakeSoft: "#183837",
  sun: "#F7B32B",
  sunSoft: "#3A2F14",
  boat: "#F07A5F",
  boatInk: "#F5A38F",
  boatSoft: "#3C231D",
  violetInk: "#B7ACF6",
  violetSoft: "#2A2550",
  ink: "#ECEFF5",
  muted: "#A4ABBC",
  line: "#2F363D",
  paper: "#111618",
  card: "#1A2023",
  track: "#293036",
  white: "#FFFFFF",
  onSun: "#1F2A44",
  sunInk: "#F7C960",
};

/** Follows the phone's light / dark setting (read when the app starts). */
export const dark = Appearance.getColorScheme() === "dark";
export const C = dark ? DARK : LIGHT;

export const F = {
  display: "Baloo2_800ExtraBold",
  displayBold: "Baloo2_700Bold",
  body: "AtkinsonHyperlegible_400Regular",
  bodyBold: "AtkinsonHyperlegible_700Bold",
};

export const R = 18;

export const shadow = {
  shadowColor: "#1F2A44",
  shadowOpacity: dark ? 0.3 : 0.07,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const TAGS: Record<string, { label: string; bg: string; fg: string }> = {
  due: { label: "Tähtaeg homme", bg: C.sunSoft, fg: C.sunInk },
  dueToday: { label: "Tähtaeg täna", bg: C.sunSoft, fg: C.sunInk },
  retake: { label: "Järeltöö", bg: C.boatSoft, fg: C.boatInk },
  test: { label: "Kontrolltöö", bg: C.violetSoft, fg: C.violetInk },
  req: { label: "Kohustuslik", bg: C.lakeSoft, fg: C.lakeInk },
  book: { label: "Raamat", bg: C.lakeSoft, fg: C.lakeInk },
  project: { label: "Projekt", bg: C.violetSoft, fg: C.violetInk },
  own: { label: "Vanem lisas", bg: C.violetSoft, fg: C.violetInk },
  old: { label: "Eilsest", bg: C.track, fg: C.muted },
  exc: { label: "Vabandatud", bg: C.track, fg: C.muted },
};
