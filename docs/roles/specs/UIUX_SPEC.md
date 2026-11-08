# 🎨 SPESIFIKASI TEKNIS: UI/UX DESIGNER & SLICER

- **Role**: `ui/ux`
- **Owner Scope**: `frontend/src/index.css`, `frontend/src/components/ui/**`, `frontend/src/assets/**`, `docs/design/**`
- **Tooling & Stack**: Tailwind CSS v4, Google Stitch, Google Fonts, Lucide Icons / Material Symbols

---

## 1. Design System: Soft Neo-Brutalism

Sesuai rancangan pada prototype Google Stitch, estetika mengusung tema **Buku Tulis Bersampul Cokelat meets Neo-Brutalism**:

### A. Palet Warna (Color Tokens)

- **Canvas Base**: `#FAF6EF` (Warm unbleached paper)
- **Card Surface**: `#FFFFFF` / `#FFFDF9`
- **Ink Navy (Structural & Shadows)**: `#1F2A44`
- **Brand Tomato (Primary Action)**: `#F26B3A`
- **Sunny Yellow (Accent / Spotlight)**: `#FFC845`
- **Soft Mint Teal (Balanced State / AI Badge)**: `#2FA39A`
- **Destructive Warning**: `#E0533C`

### B. Tipografi

- **Headings & Titles**: `Bricolage Grotesque` (Bobot 700 / 800, tight line-height).
- **Body Text & Form Inputs**: `Plus Jakarta Sans` (Bobot 400 / 600 / 700).

### C. Karakteristik Border & Shadow

- **Border**: `2px solid #1F2A44` pada seluruh elemen interaktif (card, button, input).
- **Elevation Shadow**: Hard offset solid ink shadow `3px 3px 0px #1F2A44` atau `4px 4px 0px #1F2A44`. Tidak menggunakan blur Gaussian.
- **Active / Pressed State**: `transform: translate(2px, 2px); box-shadow: 0px 0px 0px #1F2A44;`.

---

## 2. Reusable UI Kit yang Wajib Dibuat (`components/ui/`)

1. **`Button.tsx`**: Varian `primary` (Tomato), `secondary` (Yellow/White), dan `ghost`.
2. **`Card.tsx`**: Container kartu kertas dengan border 2px ink navy dan offset shadow.
3. **`Input.tsx`**: Input text & PIN box dengan styling tebal dan focus ring solid.
4. **`Badge.tsx`**: Stiker label kecil dengan slight rotation (`-2deg` atau `+2deg`).
5. **`PinDisplayCard.tsx`**: Komponen tampilan PIN besar 6-digit untuk diproyeksikan guru ke murid.
6. **`ChatBubble.tsx`**: Bubble chat dengan pembeda visual:
   - Pesan Siswa: Warna putih/kuning muda.
   - Pesan AI Kelompok: Warna soft mint teal (`#2FA39A`) dengan ikon robot sticker.

---

## 3. Larangan Keras

- ❌ Dilarang mengubah logic state fetching atau custom hooks di `frontend/src/hooks/` atau `pages/`.
- ❌ Dilarang menyentuh folder server `backend/**`.
