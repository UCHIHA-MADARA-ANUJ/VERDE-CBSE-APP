# 🪧 VERDE Exhibition Banner — 3 × A4 Triptych

Print-ready booth banner: **three A4 portrait sheets** that line up side-by-side
into one wide banner (same format as the illuminated triptych on the project table).

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  PANEL 1    │ │  PANEL 2    │ │  PANEL 3    │   →  one 630 × 297 mm banner
│  left       │ │  CENTER     │ │  right      │
└─────────────┘ └─────────────┘ └─────────────┘
```

## 📁 Files

| File | What it is |
| --- | --- |
| `print/panel-1.png` | Left sheet — print-ready, 2480 × 3508 px (A4 @ 300 dpi) |
| `print/panel-2.png` | **Center sheet** — tilted sprout logo, VERDE wordmark, "AN ECOSYSTEM" |
| `print/panel-3.png` | Right sheet — print-ready |
| `panel-1.svg` … `panel-3.svg` | Editable vector sources for the three sheets |
| `banner-preview.png` | Full banner (all three sheets side by side, downscaled) — for preview/sharing |
| `tools/gen-banner.js` | Regenerates all of the above from source |

## 🖨️ Print instructions

1. Print each file in `print/` on **A4 portrait** paper.
2. Set scale to **100% / actual size** — do **not** use "fit to page"
   (each PNG is exactly 2480 × 3508 px = 210 × 297 mm at 300 dpi).
3. Line the sheets up on the lightbox in this order:
   **panel 1 (left) → panel 2 (center) → panel 3 (right)**.
4. The center sheet carries the brand: tilted sprout logo + **VERDE** + *an ecosystem*.

## 🎨 Design

- **Palette:** near-black `#050708`, acid green `#00FF87`, white `#F2F7F3` —
  the same language as [verde-cbse.vercel.app](https://verde-cbse.vercel.app).
- **Type:** Oswald (display wordmark) + IBM Plex Mono (micro labels / HUD text).
- **Art direction:** HUD frame with corner ticks, fine grid + scanlines, vignette,
  PCB-style circuit traces with nodes/pads, dashed HUD ring around the logo,
  and a keyword strip that reads continuously across all three sheets.
- Logo: the VERDE sprout mark (`assets/logo.svg`), tilted −8°, with a soft
  acid-green glow.

## 🛠️ Regenerating / editing

```bash
cd assets/banner/tools
npm install sharp          # one-time
# install the fonts: Oswald + IBM Plex Mono (any format fontconfig can read)
node gen-banner.js         # rewrites ../panel-*.svg, ../print/panel-*.png, ../banner-preview.png
```

Edit the SVG strings inside `gen-banner.js` (text, sizes, coordinates) and re-run.
