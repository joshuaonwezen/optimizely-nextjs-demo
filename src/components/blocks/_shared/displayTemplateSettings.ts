// Shared display template settings — spread these into displayTemplate() settings
// objects so every block exposes the same controls with the same plain-English labels.

type SelectSetting = {
  editor: "select";
  displayName: string;
  sortOrder: number;
  choices: Record<string, { displayName: string; sortOrder: number }>;
};

type CheckboxSetting = {
  editor: "checkbox";
  displayName: string;
  sortOrder: number;
  choices: Record<string, never>;
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
      blue:        { displayName: "Blue",            sortOrder: 2 },
      blueGrad:    { displayName: "Blue gradient",   sortOrder: 3 },
      purple:      { displayName: "Purple",          sortOrder: 4 },
      dark:        { displayName: "Dark (inverted)", sortOrder: 5 },
      transparent: { displayName: "None",            sortOrder: 6 },
    },
  },
};

// Heading size — for any block with a visible heading or title
export const HEADING_SIZE: { headingSize: SelectSetting } = {
  headingSize: {
    editor: "select",
    displayName: "Heading size",
    sortOrder: 1,
    choices: {
      xl: { displayName: "Extra large (H1)", sortOrder: 0 },
      lg: { displayName: "Large (H2)",       sortOrder: 1 },
      md: { displayName: "Medium (H3)",      sortOrder: 2 },
      sm: { displayName: "Small (H4)",       sortOrder: 3 },
    },
  },
};

// Text alignment — for blocks where centering or right-alignment is meaningful
export const TEXT_ALIGN: { textAlign: SelectSetting } = {
  textAlign: {
    editor: "select",
    displayName: "Text alignment",
    sortOrder: 2,
    choices: {
      left:   { displayName: "Left",   sortOrder: 0 },
      center: { displayName: "Center", sortOrder: 1 },
      right:  { displayName: "Right",  sortOrder: 2 },
    },
  },
};

// Font style — Plus Jakarta Sans (display) and Inter (body) are both installed
export const FONT_STYLE: { fontStyle: SelectSetting } = {
  fontStyle: {
    editor: "select",
    displayName: "Font style",
    sortOrder: 3,
    choices: {
      modern:  { displayName: "Modern (Plus Jakarta Sans)", sortOrder: 0 },
      classic: { displayName: "Classic (Inter)",            sortOrder: 1 },
    },
  },
};

// Body text size — for blocks where the prose reading size should be adjustable
export const TEXT_SIZE: { textSize: SelectSetting } = {
  textSize: {
    editor: "select",
    displayName: "Text size",
    sortOrder: 4,
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
  dark:        { wrapper: "bg-on-surface",                                    text: "text-surface-lowest", textMuted: "text-on-brand-subtle" },
  transparent: { wrapper: "",                                                 text: "text-on-surface",     textMuted: "text-on-surface-variant" },
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
