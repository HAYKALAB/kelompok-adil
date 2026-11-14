import { useEffect, useState } from 'react';
import { subscribeSlowRequest } from '../lib/api';

export function ServerWarmingBanner() {
  const [isSlow, setIsSlow] = useState(false);
  const [message, setMessage] = useState('Server sedang disiapkan...');

  useEffect(() => {
    return subscribeSlowRequest((slow, msg) => {
      setIsSlow(slow);
      if (msg) setMessage(msg);
    });
  }, []);

  if (!isSlow) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-[#fec744] text-[#0f1b34] border-2 border-[#0f1b34] shadow-[4px_4px_0px_#0f1b34] rounded-2xl p-4 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#0f1b34] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0f1b34]">
          <span className="text-xl animate-spin" style={{ animationDuration: '3s' }}>
            ⚙️
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-extrabold text-sm tracking-tight text-[#0f1b34]">
              {message}
            </h4>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-xs text-[#0f1b34]/85 leading-relaxed font-medium">
            Layanan cloud (Render/Cloud) sedang memanaskan mesin (<em>cold start</em>) atau AI sedang memproses. Mohon tunggu beberapa detik, halaman akan terhubung otomatis!
          </p>
          <div className="mt-2.5 w-full bg-white/70 h-1.5 rounded-full overflow-hidden border border-[#0f1b34]/30">
            <div className="h-full bg-[#f26b3a] rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
