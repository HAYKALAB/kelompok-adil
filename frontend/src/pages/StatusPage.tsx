import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../lib/api';

export function StatusPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider text-blue-700 uppercase bg-blue-100 rounded-full">
          Hackathon Project Foundation &bull; Education Subtheme
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
          Platform Edukasi Terpadu
        </h1>
        <p className="mt-3 text-slate-600 max-w-2xl mx-auto text-base">
          Setup fondasi siap pakai untuk tim 4 orang (1 UI/UX, 1 Frontend, 2 Backend).
        </p>
      </div>

      {/* Grid Status & Tim */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Status Layanan System */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Status Layanan (Health Check)</h2>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isFetching ? 'Memeriksa...' : 'Periksa Ulang'}
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center space-x-3 py-6 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Menghubungi server backend...</span>
            </div>
          ) : isError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
              <p className="font-semibold">Backend Offline atau Tidak Merespons</p>
              <p className="mt-1 text-xs text-rose-600">
                {(error as Error)?.message || 'Pastikan backend berjalan di port 4000.'}
              </p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-sm font-medium text-slate-700">API Server (Express)</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Online (Status: {data.status})
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-sm font-medium text-slate-700">Database (PostgreSQL)</span>
                {data.db === 'connected' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Terhubung
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Belum Terkoneksi (Error)
                  </span>
                )}
              </div>

              {data.db !== 'connected' && (
                <p className="text-xs text-slate-500 mt-2 bg-amber-50 p-2.5 rounded border border-amber-200">
                  Catatan: Isi{' '}
                  <code className="font-mono text-amber-900 font-bold">DATABASE_URL</code> pada{' '}
                  <code className="font-mono">backend/.env</code> untuk menghubungkan database
                  Cloud/Lokal.
                </p>
              )}
            </div>
          ) : null}
        </section>

        {/* Pembagian Tugas Tim */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Pembagian Peran Tim (4 Orang)</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                UI/UX
              </span>
              <span className="text-slate-600">
                Desain flow, wireframe, & token desain di{' '}
                <code className="text-xs font-mono">docs/design/</code>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                Frontend
              </span>
              <span className="text-slate-600">
                Implementasi komponen antarmuka, routing, & konsumsi API TanStack Query.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
                Backend 1
              </span>
              <span className="text-slate-600">
                Infrastruktur data, skema Prisma, migrasi database, & autentikasi.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-bold rounded">
                Backend 2
              </span>
              <span className="text-slate-600">
                Pengembangan endpoint fitur (routes, controller, services) & validasi Zod.
              </span>
            </li>
          </ul>
        </section>
      </div>

      {/* Petunjuk Awal */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800 mb-2">Langkah Selanjutnya</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Silakan baca{' '}
          <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
            README.md
          </code>{' '}
          untuk panduan setup database cloud (Neon/Supabase) atau PostgreSQL lokal, pembuatan
          migrasi Prisma, dan penulisan fitur.
        </p>
      </section>
    </main>
  );
}
