import React from "react";
import { SvgXml } from "react-native-svg";
import { LOGO_SVG } from "./logoSvg";

export function Logo({ width = 120 }: { width?: number }) {
  return <SvgXml xml={LOGO_SVG} width={width} height={width / 3} accessibilityLabel="TASA" />;
}
