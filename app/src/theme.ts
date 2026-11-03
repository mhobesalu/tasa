// Järv palette (brand sheet, 2 Nov 2026)
export const C = {
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
};

export const F = {
  display: "Baloo2_800ExtraBold",
  displayBold: "Baloo2_700Bold",
  body: "AtkinsonHyperlegible_400Regular",
  bodyBold: "AtkinsonHyperlegible_700Bold",
};

export const R = 18;

export const shadow = {
  shadowColor: "#1F2A44",
  shadowOpacity: 0.07,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const TAGS: Record<string, { label: string; bg: string; fg: string }> = {
  due: { label: "Tähtaeg homme", bg: C.sunSoft, fg: "#7A5300" },
  dueToday: { label: "Tähtaeg täna", bg: C.sunSoft, fg: "#7A5300" },
  retake: { label: "Järeltöö", bg: C.boatSoft, fg: C.boatInk },
  test: { label: "Kontrolltöö", bg: C.violetSoft, fg: C.violetInk },
  req: { label: "Kohustuslik", bg: C.lakeSoft, fg: C.lakeInk },
  book: { label: "Raamat", bg: C.lakeSoft, fg: C.lakeInk },
  project: { label: "Projekt", bg: C.violetSoft, fg: C.violetInk },
  own: { label: "Vanem lisas", bg: C.violetSoft, fg: C.violetInk },
  old: { label: "Eilsest", bg: C.track, fg: C.muted },
  exc: { label: "Vabandatud", bg: C.track, fg: C.muted },
};
