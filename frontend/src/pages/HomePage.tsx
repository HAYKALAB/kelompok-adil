import { useState } from 'react';

const MASCOT_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1W5eZPrRliobZqL7wjMSsv9q12K9-2ZiW7u3Vggyi3NHg1EiT2-_FIyJFaiy7GVBpetGWXcV91c2HzchqV-9RucCrkr4Atyps34eet5RVzN_pDDGpsYtm3tF78FON0KtYUyftgwSVYa5r9yLYnw8-wjWY9jUJ4magzvYQhjlvzq7w-SyC0yUcdugwx-dcuLYo7kV4hrTUVcM3VWZVbaIiTL4iFe0rFglynUz9Uen5hZWA';

export function HomePage() {
  const [pin, setPin] = useState('');

  const handleBuatRoom = () => {
    // TODO: arahkan ke halaman guru buat room
  };

  const handleMasuk = () => {
    // TODO: kirim `pin` ke backend lalu arahkan ke lobi
    console.log('PIN:', pin);
  };

  return (
    <main className="flex-1 flex flex-col relative w-full bg-surface min-h-screen selection:bg-secondary-container selection:text-on-secondary-container">
      <div className="flex flex-col w-full max-w-md md:max-w-5xl mx-auto px-4 md:px-6 pb-12 pt-2 md:pt-8 select-none overflow-x-hidden">
        {/* Sticker atas */}
        <div className="flex items-center justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary-container text-on-secondary-fixed shadow-[3px_3px_0px_#0f1b34] -rotate-2 hover:rotate-0 transition-transform">
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <span className="font-label-sticker text-label-sticker tracking-wide">
              Belajar kelompok tanpa beban gratis!
            </span>
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-6 md:mb-10 relative">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-surface-container-lowest shadow-[4px_4px_0px_#0f1b34] p-1 flex items-center justify-center rotate-2">
              <img
                alt="Kelompok Adil Mascot Logo"
                className="w-full h-full object-contain rounded-xl"
                src={MASCOT_URL}
              />
            </div>
            <div className="absolute -bottom-2 -right-3 px-2 py-0.5 rounded-lg bg-tertiary text-on-tertiary font-label-md text-body-sm shadow-[2px_2px_0px_#0f1b34] -rotate-6">
              v2.0 Asik!
            </div>
          </div>

          <h1 className="font-display-hero-mobile text-display-hero-mobile md:font-display-hero md:text-display-hero text-on-surface leading-tight tracking-tight max-w-xs md:max-w-2xl">
            Kerja kelompok,
            <br />
            <span className="relative inline-block text-primary">
              nilai adil.
              <svg
                className="absolute -bottom-2 left-0 w-full overflow-visible"
                fill="none"
                height="10"
                viewBox="0 0 160 12"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 8C45 2 115 1 157 9"
                  stroke="#f26b3a"
                  strokeLinecap="round"
                  strokeWidth="5"
                />
              </svg>
            </span>
          </h1>

          <p className="font-body-md text-body-md md:text-body-lg text-on-surface-variant max-w-xs md:max-w-xl mt-3">
            Bikin ruang turnamen belajar, pantau kontribusi tiap anggota secara
            transparan, dibantu AI asisten kelompok.
          </p>
        </div>

        {/* Pilih peran */}
        <div className="flex flex-col gap-4 w-full max-w-md mx-auto mb-6 md:max-w-3xl md:grid md:grid-cols-2 md:gap-6">
          {/* Kartu Guru */}
          <div className="relative rounded-2xl bg-primary-container p-5 text-on-secondary shadow-[5px_5px_0px_#0f1b34] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#0f1b34] transition-all flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👨‍🏫</span>
                <h2 className="font-headline-md text-headline-md text-surface-container-lowest tracking-tight">
                  Aku Guru
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-primary font-label-sticker text-label-sticker shadow-[2px_2px_0px_#0f1b34] rotate-3">
                Ruang Kelas
              </span>
            </div>
            <p className="font-body-md text-body-md text-primary-fixed mb-5 leading-snug">
              Buat room turnamen &amp; pantau keaktifan siswa otomatis tanpa
              ribet spreadsheet.
            </p>
            <button
              type="button"
              onClick={handleBuatRoom}
              className="mt-auto w-full py-3 px-4 rounded-xl bg-surface-container-lowest text-on-surface font-title-md text-title-md flex items-center justify-center gap-2 shadow-[3px_3px_0px_#0f1b34] hover:-translate-y-0.5 transition-transform active:translate-y-0.5 active:shadow-[0px_0px_0px_#0f1b34]"
            >
              <span>Buat Room Baru</span>
              <span className="material-symbols-outlined text-[20px]">
                arrow_forward
              </span>
            </button>
          </div>

          {/* Kartu Murid */}
          <div className="relative rounded-2xl bg-secondary-container p-5 text-on-secondary-fixed shadow-[5px_5px_0px_#0f1b34] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#0f1b34] transition-all flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎒</span>
                <h2 className="font-headline-md text-headline-md text-on-secondary-fixed tracking-tight">
                  Aku Murid
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-tertiary text-on-tertiary font-label-sticker text-label-sticker shadow-[2px_2px_0px_#0f1b34] -rotate-2">
                Masuk Tim
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-secondary-fixed-variant mb-5 leading-snug">
              Punya PIN dari gurumu? Langsung gabung tanpa perlu login ribet
              akun baru!
            </p>
            <div className="mt-auto flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="Ketik 6 digit PIN..."
                className="flex-1 min-w-0 uppercase tracking-widest text-center px-3 py-2.5 rounded-xl bg-surface-container-lowest text-on-surface font-title-md text-title-md shadow-[2px_2px_0px_#0f1b34] placeholder:text-outline focus:outline-none focus:ring-0"
              />
              <button
                type="button"
                onClick={handleMasuk}
                className="py-2.5 px-4 rounded-xl bg-on-surface text-surface font-title-md text-title-md flex items-center justify-center gap-1 shadow-[3px_3px_0px_#f26b3a] hover:-translate-y-0.5 transition-transform active:translate-y-0.5 active:shadow-[0px_0px_0px_#0f1b34]"
              >
                <span>Masuk</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Callout */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-container-lowest text-on-surface font-label-sticker text-label-sticker shadow-[2px_2px_0px_#0f1b34] rotate-1">
            <span className="text-secondary-fixed-dim">⚡</span>
            <span>Tanpa daftar akun! Langsung pakai santai.</span>
          </div>
        </div>

        {/* Pratinjau */}
        <div className="flex flex-col gap-3 max-w-md md:max-w-3xl mx-auto w-full pt-2">
          <div className="flex items-center justify-between px-1">
            <span className="font-label-sticker text-label-sticker text-on-surface-variant uppercase tracking-wider">
              Pratinjau Seru
            </span>
            <span className="font-label-sticker text-label-sticker text-tertiary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                verified
              </span>
              Transparan 100%
            </span>
          </div>

          {/* Kartu progres */}
          <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-[4px_4px_0px_#0f1b34] -rotate-1 hover:rotate-0 transition-transform">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 shrink-0 rounded-full bg-tertiary" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface text-[16px] truncate">
                  Kelompok 3: Nusantara Hebat
                </h3>
              </div>
              <span className="shrink-0 font-label-sticker text-label-sticker bg-secondary-fixed px-2 py-0.5 rounded-lg text-on-secondary-fixed shadow-[1.5px_1.5px_0px_#0f1b34]">
                78% Beres
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden flex p-0.5 gap-1 mb-3">
              <div className="h-full bg-tertiary rounded-full w-[45%]" />
              <div className="h-full bg-secondary-container rounded-full w-[33%]" />
              <div className="h-full bg-primary-container rounded-full w-[22%]" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center -space-x-2">
                <div className="w-7 h-7 rounded-full bg-primary-container text-on-secondary flex items-center justify-center font-label-sticker text-[11px] shadow-[1px_1px_0px_#0f1b34]">
                  DF
                </div>
                <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center font-label-sticker text-[11px] shadow-[1px_1px_0px_#0f1b34]">
                  ND
                </div>
                <div className="w-7 h-7 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-label-sticker text-[11px] shadow-[1px_1px_0px_#0f1b34]">
                  BM
                </div>
                <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center font-label-sticker text-[11px] shadow-[1px_1px_0px_#0f1b34]">
                  SL
                </div>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                4 Anggota Gotong Royong
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}