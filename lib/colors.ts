/**
 * The six hues that colour Alfreed. Each has a solid fill, a soft wash, an ink
 * that reads on the wash, and `on`: the text colour that reads on the solid
 * (only cobalt is dark enough for white).
 */
export const HUES = [
  { name: "tomato", solid: "#f25c3b", wash: "#fde3db", ink: "#a8331a", on: "#1c1917" },
  { name: "marigold", solid: "#f5b335", wash: "#fdefd0", ink: "#8a5a00", on: "#1c1917" },
  { name: "cobalt", solid: "#3a5bf0", wash: "#e0e6fd", ink: "#2238a8", on: "#ffffff" },
  { name: "mint", solid: "#2fb37e", wash: "#d9f3e7", ink: "#17734e", on: "#1c1917" },
  { name: "orchid", solid: "#c25bd6", wash: "#f5e0f9", ink: "#86329a", on: "#1c1917" },
  { name: "sky", solid: "#3fa9e6", wash: "#dcf0fb", ink: "#1a6d9e", on: "#1c1917" },
] as const;

export type Hue = (typeof HUES)[number];

/** A stable hue per listing, so a draw keeps its colour everywhere it appears. */
export function hueFor(key: string): Hue {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

/** Board rows of ten each get their own hue: 1–10 tomato, 11–20 marigold, and so on. */
export function hueForNumber(n: number): Hue {
  return HUES[Math.floor((n - 1) / 10) % HUES.length];
}

/** CSS variables for a hue, consumed by bg-(--accent) style utilities. */
export function hueVars(hue: Hue): React.CSSProperties {
  return {
    "--accent": hue.solid,
    "--accent-wash": hue.wash,
    "--accent-ink": hue.ink,
    "--accent-on": hue.on,
  } as React.CSSProperties;
}
