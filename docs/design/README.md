# Handoff UI/UX & Design Guidelines

Folder ini digunakan oleh anggota tim peran UI/UX untuk berbagi artefak desain dengan pengembang frontend.

## 1. Tautan Desain & Prototype

- **Figma File:** `[Tempelkan tautan Figma project lomba di sini]`
- **Interactive Prototype:** `[Tempelkan tautan flow prototype di sini]`

## 2. Token Desain Awal (Tailwind v4 Setup)

Proyek frontend dikonfigurasi menggunakan Tailwind CSS v4. Konfigurasi tema dan warna dapat diselaraskan di `frontend/src/index.css`.

### Palet Warna Netral (Education Subtheme):

- **Primary:** Biru Edukasi (`#2563EB` / `blue-600`) - simbol kepercayaan dan pembelajaran.
- **Secondary:** Emerald (`#059669` / `emerald-600`) - indikator pencapaian, kuis, status sukses.
- **Background:** Slate 50 (`#F8FAFC` / `slate-50`)
- **Card / Surface:** Putih (`#FFFFFF`)
- **Text Primary:** Slate 900 (`#0F172A`)
- **Text Secondary:** Slate 500 (`#64748B`)
- **Danger / Error:** Rose 600 (`#E11D48`)

### Tipografi

- Font default: Sans-serif modern (Inter / system-ui).

## 3. Alur Kerja Handoff

1. UI/UX mendesain antarmuka di Figma menggunakan grid 8pt/4pt.
2. Setiap komponen yang siap diberi status "Ready for Dev" di Figma.
3. Frontend mengimplementasikan komponen modular di folder `frontend/src/components/`.
