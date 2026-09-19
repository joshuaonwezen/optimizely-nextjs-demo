// Shared display template settings — spread these into displayTemplate() settings
// objects so every block exposes the same controls with the same plain-English labels.
//
// sortOrder is reserved 0-9 for the shared settings below. Block-specific inline
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

// Same choices as BACKGROUND, reordered so "Bright green" (blueGrad, the green
// gradient) sits at sortOrder 0 and becomes the display-template default the CMS
// applies when the editor hasn't picked a background. For hero blocks whose code
// intends a brand-green gradient (a plain White default would flatten them).
export const BACKGROUND_BRAND_DEFAULT: { background: SelectSetting } = {
  background: {
    editor: "select",
    displayName: "Background color",
    sortOrder: 0,
    choices: {
      blueGrad:    { displayName: "Bright green",      sortOrder: 0 },
      white:       { displayName: "White",             sortOrder: 1 },
      offWhite:    { displayName: "Off-white",         sortOrder: 2 },
      blue:        { displayName: "Green",             sortOrder: 3 },
      purple:      { displayName: "Teal",              sortOrder: 4 },
      dark:        { displayName: "Dark",              sortOrder: 5 },
      transparent: { displayName: "None",              sortOrder: 6 },
      opal:        { displayName: "Expressive (Opal)", sortOrder: 7 },
    },
  },
};

// Same choices as BACKGROUND, reordered so "Off-white" sits at sortOrder 0 and
// becomes the display-template default the CMS applies when the editor hasn't
// picked a background. For blocks whose code intends an off-white surface.
export const BACKGROUND_OFFWHITE_DEFAULT: { background: SelectSetting } = {
  background: {
    editor: "select",
    displayName: "Background color",
    sortOrder: 0,
    choices: {
      offWhite:    { displayName: "Off-white",         sortOrder: 0 },
      white:       { displayName: "White",             sortOrder: 1 },
      blue:        { displayName: "Green",             sortOrder: 2 },
      blueGrad:    { displayName: "Bright green",      sortOrder: 3 },
      purple:      { displayName: "Teal",              sortOrder: 4 },
      dark:        { displayName: "Dark",              sortOrder: 5 },
      transparent: { displayName: "None",              sortOrder: 6 },
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

// Headline style - "3D extruded" draws a hero title as optimizely.com's stacked
// green type (<ExtrudedHeadline>). Standard is first so existing heroes are unchanged.
export const HEADLINE_STYLE: { headlineStyle: SelectSetting } = {
  headlineStyle: {
    editor: "select",
    displayName: "Headline style",
    sortOrder: 6,
    choices: {
      flat:     { displayName: "Standard",    sortOrder: 0 },
      extruded: { displayName: "3D extruded", sortOrder: 1 },
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

// Returns a copy of a shared setting with `choice` moved to sortOrder 0, keeping the
// other choices in their original order. The sortOrder 0 choice is what the CMS
// stores when an editor never touches the control, and that stored value beats the
// block's code fallback - so use this whenever a block's intended default differs.
// Choice keys are unchanged, so it never orphans stored values.
export function withDefault<T extends Record<string, SelectSetting>>(group: T, choice: string): T {
  const [name, setting] = Object.entries(group)[0];
  if (!(choice in setting.choices)) throw new Error(`withDefault: "${choice}" is not a ${name} choice`);
  const rest = Object.entries(setting.choices)
    .filter(([key]) => key !== choice)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder);
  const choices = Object.fromEntries(
    [[choice, setting.choices[choice]] as const, ...rest].map(([key, c], i) => [key, { ...c, sortOrder: i }]),
  );
  return { [name]: { ...setting, choices } } as T;
}

// Checkbox settings arrive from Graph as the strings "True"/"False". The SDK's
// parseDisplaySettings only converts lowercase "true"/"false", so a plain
// `=== true` never fires and `!== false` is always true. Always read checkboxes here.
export function isChecked(ds: DisplaySettings, key: string): boolean {
  const value = ds?.[key];
  return value === true || String(value).toLowerCase() === "true";
}

// ─── Layout settings ──────────────────────────────────────────────────────────
// Spacing, width and columns differ per block, so their first choice is "Standard":
// the block's own current layout, passed to the helper as `standard`. Content that
// never set these keeps rendering exactly as before.

export const SPACING: { spacing: SelectSetting } = {
  spacing: {
    editor: "select",
    displayName: "Vertical spacing",
    sortOrder: 6,
    choices: {
      default:  { displayName: "Standard", sortOrder: 0 },
      none:     { displayName: "None",     sortOrder: 1 },
      compact:  { displayName: "Compact",  sortOrder: 2 },
      spacious: { displayName: "Spacious", sortOrder: 3 },
    },
  },
};

export const CONTENT_WIDTH: { contentWidth: SelectSetting } = {
  contentWidth: {
    editor: "select",
    displayName: "Content width",
    sortOrder: 7,
    choices: {
      default: { displayName: "Standard", sortOrder: 0 },
      narrow:  { displayName: "Narrow",   sortOrder: 1 },
      wide:    { displayName: "Wide",     sortOrder: 2 },
    },
  },
};

// For blocks that lay their items out in a grid.
export const COLUMNS: { columns: SelectSetting } = {
  columns: {
    editor: "select",
    displayName: "Columns",
    sortOrder: 8,
    choices: {
      default: { displayName: "Standard", sortOrder: 0 },
      two:     { displayName: "2",        sortOrder: 1 },
      three:   { displayName: "3",        sortOrder: 2 },
      four:    { displayName: "4",        sortOrder: 3 },
    },
  },
};

const SPACING_CLASSES: Record<string, string> = { none: "", compact: "py-8", spacious: "py-24" };
const WIDTH_CLASSES: Record<string, string> = { narrow: "max-w-3xl", wide: "max-w-7xl" };
const COLUMN_CLASSES: Record<string, string> = {
  two:   "sm:grid-cols-2",
  three: "sm:grid-cols-2 lg:grid-cols-3",
  four:  "sm:grid-cols-2 lg:grid-cols-4",
};

export function spacingClass(ds: DisplaySettings, standard: string): string {
  return SPACING_CLASSES[ds?.spacing as string] ?? standard;
}

export function widthClass(ds: DisplaySettings, standard: string): string {
  return WIDTH_CLASSES[ds?.contentWidth as string] ?? standard;
}

export function columnsClass(ds: DisplaySettings, standard: string): string {
  return COLUMN_CLASSES[ds?.columns as string] ?? standard;
}

// Positions a max-width box (a header, an intro paragraph) to match its text
// alignment: centered text in a centered box, right-aligned text on the right.
const ALIGN_BOX: Record<string, string> = { center: "mx-auto", right: "ml-auto" };

export function alignBoxClass(ds: DisplaySettings, standard: string): string {
  return ALIGN_BOX[(ds?.textAlign as string) || standard] ?? "";
}

// Where a composition placed the block. GridComponentWrapper passes "element" for
// blocks inside a row/column; anything else is a section in its own right.
export type Placement = "section" | "element";

// A section-level block supplies its own page container (max width, centering, side
// padding). Inside a column the row already provides one, so drop it there.
export function pageContainer(placement: Placement | undefined, classes: string): string {
  return placement === "element" ? "" : classes;
}

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
  invert: boolean;
};

// Backgrounds whose resolved foreground is light - rich text on these needs
// .richtext-invert so headings / list markers stay legible.
const LIGHT_FG_BACKGROUNDS = new Set(["dark", "blueGrad", "opal"]);

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
    invert:
      pick("textColor") === "light" ||
      (pick("textColor") === "auto" && LIGHT_FG_BACKGROUNDS.has(pick("background"))),
  };
}

// Convenience: the three controls every editor-facing block should expose.
export const STANDARD_STYLE_SETTINGS = {
  ...BACKGROUND,
  ...TEXT_COLOR,
  ...FONT_STYLE,
};
