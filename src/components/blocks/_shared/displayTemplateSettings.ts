// Shared display template settings — spread these into displayTemplate() settings
// objects so every block exposes the same controls with the same plain-English labels.
//
// sortOrder is reserved 0-5 for the shared settings below. Block-specific inline
// settings must use 10+ so the two never collide in the CMS editor panel.

type SelectSetting = {
  editor: "select";
  displayName: string;
  sortOrder: number;
  choices: Record<string, { displayName: string; sortOrder: number }>;
};

// Background color options — for any block that renders with a card or section background
export const BACKGROUND: { background: SelectSetting } = {
  background: {
    editor: "select",
    displayName: "Background color",
    sortOrder: 0,
    choices: {
      white:       { displayName: "White",          sortOrder: 0 },
      offWhite:    { displayName: "Off-white",       sortOrder: 1 },
      blue:        { displayName: "Green",           sortOrder: 2 },
      blueGrad:    { displayName: "Bright green",    sortOrder: 3 },
      purple:      { displayName: "Teal",            sortOrder: 4 },
      dark:        { displayName: "Dark",            sortOrder: 5 },
      transparent: { displayName: "None",            sortOrder: 6 },
      opal:        { displayName: "Expressive (Opal)", sortOrder: 7 },
    },
  },
};

// Same choices as BACKGROUND, reordered so "None" (transparent) sits at sortOrder 0
// and becomes the display-template default the CMS applies when the editor hasn't
// picked a background. For flat/content blocks that should inherit the parent's
// background rather than paint a white card. Card blocks keep BACKGROUND (White default).
export const BACKGROUND_NONE_DEFAULT: { background: SelectSetting } = {
  background: {
    editor: "select",
    displayName: "Background color",
    sortOrder: 0,
    choices: {
      transparent: { displayName: "None",             sortOrder: 0 },
      white:       { displayName: "White",            sortOrder: 1 },
      offWhite:    { displayName: "Off-white",        sortOrder: 2 },
      blue:        { displayName: "Green",            sortOrder: 3 },
      blueGrad:    { displayName: "Bright green",     sortOrder: 4 },
      purple:      { displayName: "Teal",             sortOrder: 5 },
      dark:        { displayName: "Dark",             sortOrder: 6 },
      opal:        { displayName: "Expressive (Opal)", sortOrder: 7 },
    },
  },
};

// Text color — for any block with visible text. "auto" keeps the historic
// behaviour of deriving text color from the chosen background, so unset content
// renders exactly as it did before this setting existed.
export const TEXT_COLOR: { textColor: SelectSetting } = {
  textColor: {
    editor: "select",
    displayName: "Text color",
    sortOrder: 1,
    choices: {
      auto:  { displayName: "Automatic", sortOrder: 0 },
      dark:  { displayName: "Dark",      sortOrder: 1 },
      muted: { displayName: "Muted",     sortOrder: 2 },
      brand: { displayName: "Green",     sortOrder: 3 },
      teal:  { displayName: "Teal",      sortOrder: 4 },
      light: { displayName: "Light",     sortOrder: 5 },
    },
  },
};

// Heading size — for any block with a visible heading or title
export const HEADING_SIZE: { headingSize: SelectSetting } = {
  headingSize: {
    editor: "select",
    displayName: "Heading size",
    sortOrder: 2,
    choices: {
      xl: { displayName: "Extra large (H1)", sortOrder: 0 },
      lg: { displayName: "Large (H2)",       sortOrder: 1 },
      md: { displayName: "Medium (H3)",      sortOrder: 2 },
      sm: { displayName: "Small (H4)",       sortOrder: 3 },
    },
  },
};

// Heading size with a Medium (H3) default — for compact blocks (e.g. product
// cards) where an Extra large (H1) default is too big and overflows. Same choices
// as HEADING_SIZE, reordered so "Medium (H3)" sits at sortOrder 0 and becomes the
// display-template default the CMS applies when the editor hasn't picked a size.
export const HEADING_SIZE_CARD: { headingSize: SelectSetting } = {
  headingSize: {
    editor: "select",
    displayName: "Heading size",
    sortOrder: 2,
    choices: {
      md: { displayName: "Medium (H3)",      sortOrder: 0 },
      lg: { displayName: "Large (H2)",       sortOrder: 1 },
      sm: { displayName: "Small (H4)",       sortOrder: 2 },
      xl: { displayName: "Extra large (H1)", sortOrder: 3 },
    },
  },
};

// Text alignment — for blocks where centering or right-alignment is meaningful
export const TEXT_ALIGN: { textAlign: SelectSetting } = {
  textAlign: {
    editor: "select",
    displayName: "Text alignment",
    sortOrder: 3,
    choices: {
      left:   { displayName: "Left",   sortOrder: 0 },
      center: { displayName: "Center", sortOrder: 1 },
      right:  { displayName: "Right",  sortOrder: 2 },
    },
  },
};

// Font style — VC Nudge (display) and Die Grotesk (body) are both installed.
// The `modern`/`classic` keys are stored in published content, so they stay as-is.
export const FONT_STYLE: { fontStyle: SelectSetting } = {
  fontStyle: {
    editor: "select",
    displayName: "Font family",
    sortOrder: 4,
    choices: {
      modern:  { displayName: "Display (VC Nudge)",   sortOrder: 0 },
      classic: { displayName: "Body (Die Grotesk)",   sortOrder: 1 },
      mono:    { displayName: "Captions (Roboto Mono)", sortOrder: 2 },
    },
  },
};

// Body text size — for blocks where the prose reading size should be adjustable
export const TEXT_SIZE: { textSize: SelectSetting } = {
  textSize: {
    editor: "select",
    displayName: "Text size",
    sortOrder: 5,
    choices: {
      sm: { displayName: "Small",  sortOrder: 0 },
      md: { displayName: "Medium", sortOrder: 1 },
      lg: { displayName: "Large",  sortOrder: 2 },
    },
  },
};

// ─── Tailwind class lookups ────────────────────────────────────────────────────

// Background → wrapper/text Tailwind classes
export const BG_CLASSES: Record<string, { wrapper: string; text: string; textMuted: string }> = {
  white:       { wrapper: "bg-surface-lowest border border-outline-variant",  text: "text-on-surface",     textMuted: "text-on-surface-variant" },
  offWhite:    { wrapper: "bg-surface-low border border-outline-variant",     text: "text-on-surface",     textMuted: "text-on-surface-variant" },
  blue:        { wrapper: "bg-brand/10 border border-brand/20",               text: "text-brand",          textMuted: "text-on-surface-variant" },
  blueGrad:    { wrapper: "bg-gradient-brand",                                text: "text-on-brand",       textMuted: "text-on-brand-subtle" },
  purple:      { wrapper: "bg-tertiary/10 border border-tertiary/20",         text: "text-tertiary",       textMuted: "text-on-surface-variant" },
  dark:        { wrapper: "bg-on-surface",                                    text: "text-surface-lowest", textMuted: "text-surface-high" },
  transparent: { wrapper: "",                                                 text: "text-on-surface",     textMuted: "text-on-surface-variant" },
  opal:        { wrapper: "opal-surface",                                     text: "text-on-brand",       textMuted: "text-on-brand-subtle" },
};

// Heading size → Tailwind text size classes
export const HEADING_CLASSES: Record<string, string> = {
  xl: "text-5xl md:text-6xl",
  lg: "text-4xl md:text-5xl",
  md: "text-3xl md:text-4xl",
  sm: "text-2xl md:text-3xl",
};

// Font style → Tailwind font-family classes
export const FONT_CLASSES: Record<string, string> = {
  modern:  "font-display",
  classic: "font-body",
  mono:    "font-mono",
};

// Text color → Tailwind text color classes. "auto" is intentionally absent:
// resolveStyleClasses() treats a missing entry as "follow the background".
export const TEXT_COLOR_CLASSES: Record<string, { text: string; textMuted: string }> = {
  dark:  { text: "text-on-surface",         textMuted: "text-on-surface-variant" },
  muted: { text: "text-on-surface-variant", textMuted: "text-on-surface-variant" },
  brand: { text: "text-brand",              textMuted: "text-brand/70" },
  teal:  { text: "text-tertiary",           textMuted: "text-tertiary/70" },
  light: { text: "text-surface-lowest",     textMuted: "text-surface-high" },
};

// Text size → Tailwind prose size classes
export const TEXT_SIZE_CLASSES: Record<string, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

// Text alignment → Tailwind text-align classes
export const TEXT_ALIGN_CLASSES: Record<string, string> = {
  left:   "text-left",
  center: "text-center",
  right:  "text-right",
};

// ─── Resolver ──────────────────────────────────────────────────────────────────

export type DisplaySettings = Record<string, string | boolean> | undefined;

export type StyleFallbacks = {
  background?: string;
  textColor?: string;
  headingSize?: string;
  fontStyle?: string;
  textAlign?: string;
  textSize?: string;
};

export type ResolvedStyles = {
  wrapper: string;
  text: string;
  textMuted: string;
  heading: string;
  font: string;
  align: string;
  size: string;
};

const DEFAULTS: Required<StyleFallbacks> = {
  background: "transparent",
  textColor: "auto",
  headingSize: "lg",
  fontStyle: "modern",
  textAlign: "left",
  textSize: "md",
};

// Single entry point for every block's display-template styling. Blocks pass their
// own historic defaults via `fallbacks` so adding a setting never changes how
// already-published content renders.
export function resolveStyleClasses(ds: DisplaySettings, fallbacks: StyleFallbacks = {}): ResolvedStyles {
  const pick = (key: keyof StyleFallbacks) =>
    (ds?.[key] as string) || fallbacks[key] || DEFAULTS[key];

  const bg = BG_CLASSES[pick("background")] ?? BG_CLASSES.transparent;

  // "auto" (and any unknown value) means: take text color from the background.
  const override = TEXT_COLOR_CLASSES[pick("textColor")];

  return {
    wrapper:   bg.wrapper,
    text:      override?.text ?? bg.text,
    textMuted: override?.textMuted ?? bg.textMuted,
    heading:   HEADING_CLASSES[pick("headingSize")] ?? HEADING_CLASSES.lg,
    font:      FONT_CLASSES[pick("fontStyle")] ?? FONT_CLASSES.modern,
    align:     TEXT_ALIGN_CLASSES[pick("textAlign")] ?? TEXT_ALIGN_CLASSES.left,
    size:      TEXT_SIZE_CLASSES[pick("textSize")] ?? TEXT_SIZE_CLASSES.md,
  };
}

// Convenience: the three controls every editor-facing block should expose.
export const STANDARD_STYLE_SETTINGS = {
  ...BACKGROUND,
  ...TEXT_COLOR,
  ...FONT_STYLE,
};
