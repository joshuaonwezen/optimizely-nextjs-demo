# Design System: Optimizely Brand

## 1. Overview & Creative North Star
Bright and playful hues offset by sophisticated darks and neutrals - a palette that balances play and professionalism.

The system leads with **neutral backdrops**. Neutral 1 (white) and Neutral 3 are the stage; the vibrant greens are what shine on it. Green is used sparingly and with intent, never as an all-over wash. Dark Fir grounds everything: it is the text color, the stroke color, and the anchor that keeps the greens from reading as merely loud.

---

## 2. Colors

### Primary
| Name | Hex | Role |
|---|---|---|
| LFGreen | `#abff44` | The signature fill. Buttons, hero panels, badges. Always with Dark Fir on top. |
| Grass | `#7ddd3d` | Hover/pressed state for LFGreen fills. |
| Good-to-go | `#3ab533` | Fill only - 2.4:1 on neutrals, so never for text. |
| Neutral 1 | `#ffffff` | Cards, top-layer surfaces. |
| Neutral 3 | `#e4f0da` | Primary content areas. |

### Secondary
| Name | Hex | Role |
|---|---|---|
| Light Blue | `#91dbda` | Accent fills, chips. |
| Dark Fir | `#08251a` | All body text, all strokes, dark-mode base. |

### Tertiary
Dark Blue `#007b79` · Light Fir `#197050` · Mid Fir `#0d3a29` · Light Pink `#ff99b6` · Dark Pink `#8f4764` · Neutral 2 `#eff6e9` · Neutral 4 `#d8e4cb` · Neutral 5 `#c3ceaf` · Neutral 6 `#a1ac8d`

### The ink/fill split - the one thing to understand before touching color
LFGreen is a **light** color. On a neutral background it lands at roughly 1.1:1, so it can never be text. But it is also the brand's signature. The token layer resolves this by splitting the job:

| Token | Value (light) | Use for |
|---|---|---|
| `--color-brand` | Light Fir `#197050` | **Ink.** `text-brand`, `border-brand`, `bg-brand/10` tints, focus rings. 5.5:1 on Neutral 2. |
| `--color-brand-fill` | LFGreen `#abff44` | **Surfaces.** `bg-brand-fill`, always paired with `text-on-brand`. 13.3:1. |
| `--color-brand-fill-dim` | Grass `#7ddd3d` | Hover on brand fills. |
| `--color-on-brand` | Dark Fir `#08251a` | Anything sitting on a brand fill. |

The practical rule: **`bg-brand-fill` always ships with `text-on-brand`.** If you find yourself writing `text-white` on a green surface, you have the polarity backwards.

Two more tokens flip their foreground per theme, because their backgrounds invert: `--color-on-tertiary` (white in light, Dark Fir in dark) and `--color-on-error` (same). Use them rather than assuming.

### Surface hierarchy
Treat the UI as a physical stack of material. Boundaries come from **background shifts**, not lines.
- **Base:** `surface` (Neutral 2)
- **Mid:** `surface-low` (Neutral 3) or `surface-container` (Neutral 4)
- **Top (cards, modals):** `surface-lowest` (Neutral 1, white)

In dark mode this same ramp runs Dark Fir → Mid Fir → Light Fir, with Neutral 3 as the text color.

### Don'ts
- **No gradients.** Anywhere. (`.bg-gradient-brand` is a legacy class name that now paints a solid LFGreen - the name survives only because it is baked into published CMS content.)
- **No tertiary colors as a background.**
- **No color other than Dark Fir as a stroke.** Borders are Dark Fir at low alpha; that is what `--outline-variant` and `--ghost-border-color` are.
- **No new color combinations.** Muted text and strokes are *alpha of Dark Fir*, not invented hues - no palette entry lands in the muted-text contrast band, so alpha is the sanctioned escape hatch.
- **No colored type over photography** other than primary-palette colors.
- **Don't use 100% black.** `on-surface` is Dark Fir `#08251a`.

---

## 3. Typography

| Role | Family | Weights |
|---|---|---|
| Headlines | VC Nudge SemiNormal | ExtraBold (800) for H1 & H2, SemiBold (600) for H2 |
| Body copy | Die Grotesk | Bold (700) & Medium (500) for eyebrows and subheadings, Regular (400) for body |
| Captions & buttons | Roboto Mono | Regular (400) |

### Metrics
| Element | Leading | Tracking |
|---|---|---|
| H1 | 100% | -3% |
| H2 | 100% | -2% |
| Eyebrows & subheadings | 110% | 0 |
| Body | 120-130% | 0 |
| Captions | 120-130% | +3% |
| Buttons | - | 0 |

Use the `.type-h1`, `.type-h2`, `.type-eyebrow`, `.type-body`, `.type-caption` utilities in `globals.css` rather than hand-rolling tracking per block.

### Fallback stack
Where the licensed fonts are unavailable, the brand's own web-experience spec applies: **Tahoma** for headlines and buttons, **Arial** for body and subheadings. These are wired as `next/font` fallbacks, so degradation stays on-brand.

**Wiring gotcha:** `--font-display` / `--font-body` / `--font-mono` in the `@theme inline` block must resolve through `var(--font-*-local)` - the variables `next/font` sets on `<body>`. Hardcoding a family name there compiles the utility to a literal string, and the loaded font is silently ignored with no error.

---

## 4. Elevation & Depth
Prioritize **tonal layering** over drop shadows.
- Place a `surface-lowest` (white) element atop a `surface-container` background; the luminosity step alone creates the lift.
- When something must genuinely float, use the diffused `--shadow-ambient` (`0 20px 40px rgba(8, 37, 26, 0.08)`). The shadow is Dark Fir at low alpha, so it reads as natural ambient light rather than gray haze.
- **Ghost border:** where a container sits on a background of similar value, `1px solid var(--ghost-border-color)` - Dark Fir at 10%. Felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** LFGreen fill (`bg-brand-fill`), Dark Fir text (`text-on-brand`), `DEFAULT` (0.5rem) radius. Hover to Grass (`hover:bg-brand-fill-dim`).
- **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
- **Tertiary/ghost:** Dark Fir stroke at low alpha, `text-brand` label.

### Cards & Lists
- No divider lines. Separate with `spacing-8` (2rem) of vertical space or a background shift to `surface-low`.
- Corner radius `lg` (1rem).

### Input Fields
- **Container:** `surface-container-highest` at 40% opacity.
- **Active:** 2px bottom-only highlight using `--color-brand` (Light Fir).
- **Error:** `text-error` for the message, `bg-error/10` for the field background. Error is Dark Pink in light mode and Light Pink in dark - Dark Pink only clears 2.5:1 on a Dark Fir background, which is why the token flips.

### Data Chips
- `secondary-container` (Light Blue) with `on-secondary-container` text, `full` (9999px) radius to contrast the `DEFAULT` corners elsewhere.

---

## 6. Do's
- **Aggressive whitespace.** `spacing-20` / `spacing-24` between major sections.
- **Let neutrals dominate.** Green is punctuation, not paragraph.
- **Layer with intent.** Every lifted element needs a reason to be closer to the user.
- **Reach for a token, never a hex.** The entire palette lives in the `:root` block of `globals.css`; a raw hex or a `bg-[#...]` class in a component is a bug.

## 7. Signature Component: The "Insight Rail"
A 2px vertical accent line in solid Light Fir (`--primary`), placed to the left of headline groups to anchor content and thread a signature through the journey. Formerly a gradient; flattened to a solid, per the no-gradients rule.
