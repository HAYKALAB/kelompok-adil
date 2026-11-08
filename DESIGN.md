# Kelompok Adil — Design System & Brand Direction

## 1. Identity & Personality
- **Product Name**: Kelompok Adil (Subtema: Smart & Fun Education)
- **Tagline**: *"Kerja kelompok, nilai adil. Bikin kelompok anti-beban! Pantau kontribusi transparan & seru bergaya turnamen kelas."*
- **Vibe & Atmosphere**: Indie-playful, tactile classroom tournament and fair-grouping engine tailored for Indonesian students and progressive educators. The visual atmosphere fuses the organizational clarity of Notion, the gamified warmth of Duolingo, and the tactile nostalgia of an artisanal Indonesian school notebook (*buku tulis bersampul cokelat* meets modern neo-brutalism).
- **Tone**: Hangat, suportif, kasual, tapi adil (*fair play*). Microcopy utilizes warm, encouraging Bahasa Indonesia (*"Yuk mulai!"*, *"Giliranmu kocok dadu!"*, *"Bagi kelompok adil"*).
- **Tactility**: Tangible physical metaphors—masking tape headers, sticker badges with slight rotation (-2° to 3°), and stamp-pressed confirmation tags.

---

## 2. Palette Architecture (Color Tokens)
- **Canvas Base (`#FAF6EF`)**: Warm, unbleached pulp paper. Never use pure `#FFFFFF` as the main app backdrop.
- **Card Surfaces (`#FFFFFF` and `#FFFDF9`)**: Clean surface cards that pop forward from the paper canvas.
- **Ink Navy (`#1F2A44`)**: Structural anchor. Replaces pure black for all typography, 2px structural outlines, icons, and hard drop-shadows.
- **Brand Tomato (`#F26B3A`)**: Vibrant primary action color for primary CTAs, active tournament tags, and countdown counters.
- **Sunny Yellow (`#FFC845`)**: Highlighting accent used for leaderboards, celebration cards, ribbons, and alert spotlights.
- **Soft Mint Teal (`#2FA39A`)**: Balanced state color for verified teams, AI assistant badge, success states, and equitable score distributions.
- **Chili Coral (`#E0533C`)**: Destructive warnings, penalties, and urgency markers.
- **Sticker Pastels (`#E8DDFB` Lavender, `#FFE3D8` Peach, `#D8F3E5` Pale Mint)**: Decorative backing plates for badges, tags, and rotated student avatar backdrops.

---

## 3. Typography
- **Headings & Brackets (`Bricolage Grotesque`)**: Provides rhythmic, slightly irregular, personality-packed letterforms reminiscent of hand-drawn woodcut or rubber-stamp signage. Tight line-heights.
- **Body & Form Inputs (`Plus Jakarta Sans`)**: Anchors legibility with humanist geometric precision.

---

## 4. Elevation, Outlines & Hard Shadows (Soft Neo-Brutalism)
- **Outlines**: `2px solid #1F2A44` pada seluruh elemen interaktif (card, button, input).
- **Hard Drop Shadows**: Solid ink offset `3px 3px 0px #1F2A44` (card & inputs), `4px 4px 0px #1F2A44` (buttons on hover), `6px 6px 0px #1F2A44` (modals).
- **Pressed State**: `transform: translate(2px, 2px); box-shadow: 0px 0px 0px #1F2A44;`.
- **Zero Frosted Blurs / Zero Blurry Glows**: Strictly avoiding generic AI purple-blue glows and excessive glassmorphism.

---

## 5. Dials
- **ENERGY**: 3 (High personality, playful stickers, responsive feedback)
- **RHYTHM**: 2 (Structured, clear classroom flow)
- **MOTION**: 2 (Snappy, springy button taps, clean modal transitions)
