import React from "react";
import { SvgXml } from "react-native-svg";
import { C, dark } from "../theme";
import { LOGO_SVG } from "./logoSvg";

// The logo's ink is navy; on the dark theme it uses the light ink colour instead.
const XML = dark ? LOGO_SVG.replace(/#1F2A44/gi, C.ink) : LOGO_SVG;

export function Logo({ width = 120 }: { width?: number }) {
  return <SvgXml xml={XML} width={width} height={width / 3} accessibilityLabel="TASA" />;
}
