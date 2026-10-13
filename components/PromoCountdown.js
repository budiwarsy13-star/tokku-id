"use client";

import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { sekarang } from "@/lib/promo";

function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hari = Math.floor(h / 24);
  const pad = (n) => String(n).padStart(2, "0");
  if (hari >= 1) return `${hari} hari ${pad(h % 24)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Countdown ke `endsAt`. Saat habis, panggil onExpire (biar halaman ngitung ulang harga).
// Catatan: pakai jam HP pembeli, jadi cuma buat tampilan. Harga yang ditagih tetap
// dihitung server pakai jam server (lihat /api/checkout).
export default function PromoCountdown({ endsAt, onExpire, label = "Berakhir dalam", className = "" }) {
  const target = new Date(endsAt).getTime();
  const [sisa, setSisa] = useState(() => target - sekarang());

  useEffect(() => {
    const tick = () => {
      const s = target - sekarang();
      setSisa(s);
      if (s <= 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (sisa <= 0) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[#A32D2D] ${className}`}>
      <Flame size={13} />
      {label} <span className="font-mono tabular-nums">{format(sisa)}</span>
    </span>
  );
}
