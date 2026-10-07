// lib/theme.js — default theme + helper

export const DEFAULT_THEME = {
  layout:     "classic",      // classic | minimal | bold
  header: {
    style:        "banner",   // banner | simple | centered
    height:       "md",       // sm | md | lg
    overlay:      true,
    textPosition: "left",     // left | center | right
  },
  typography: {
    fontFamily:  "Plus Jakarta Sans",
    titleSize:   "lg",        // sm | md | lg | xl
    titleWeight: "bold",      // normal | bold | black
  },
  colors: {
    accent:     "#D85A30",
    background: "#FAFAF7",
    surface:    "#FFFFFF",
    text:       "#1C1C1A",
  },
  product: {
    grid:        "2",         // 2 | 3 | auto
    cardStyle:   "clean",     // clean | shadow | bordered
    imageRatio:  "square",    // square | portrait
    showPrice:   true,
  },
  sections: {
    showDescription:    true,
    showBanner:         true,
    showPromoCarousel:  true,
  },
};

export function mergeTheme(stored = {}) {
  return {
    ...DEFAULT_THEME,
    ...stored,
    header:     { ...DEFAULT_THEME.header,     ...(stored.header     || {}) },
    typography: { ...DEFAULT_THEME.typography, ...(stored.typography || {}) },
    colors:     { ...DEFAULT_THEME.colors,     ...(stored.colors     || {}) },
    product:    { ...DEFAULT_THEME.product,    ...(stored.product    || {}) },
    sections:   { ...DEFAULT_THEME.sections,   ...(stored.sections   || {}) },
  };
}

export const FONTS = [
  { label: "Plus Jakarta Sans", value: "Plus Jakarta Sans", vibe: "Modern & Clean" },
  { label: "Montserrat",        value: "Montserrat",        vibe: "Classic & Versatile" },
  { label: "Space Grotesk",     value: "Space Grotesk",     vibe: "Techy & Bold" },
  { label: "Playfair Display",  value: "Playfair Display",  vibe: "Elegant & Luxury" },
  { label: "Unbounded",         value: "Unbounded",         vibe: "Streetwear & Hype" },
  { label: "DM Serif Display",  value: "DM Serif Display",  vibe: "Editorial & Premium" },
];

export const HEADER_HEIGHTS = { sm: "h-32", md: "h-48 md:h-64", lg: "h-64 md:h-80" };
export const GRID_COLS = { "2": "grid-cols-2", "3": "grid-cols-2 md:grid-cols-3", "auto": "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" };
