"use client";

import { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { sekarang } from "@/lib/promo";

// Warna flash sale SENGAJA tetap (merah-oranye), gak ikut tema toko: tujuannya
// biar pembeli langsung noticed & kontras di tema terang maupun gelap.
export const GRADIEN_FLASH = "linear-gradient(120deg, #B3261E 0%, #E8590C 62%, #F59F00 100%)";

const pad = (n) => String(n).padStart(2, "0");

// Sisa waktu menuju `endsAt`, update tiap detik (pakai jam server lewat sekarang()).
// onExpire dipanggil SEKALI saat habis, lalu timer berhenti.
export function useSisaWaktu(endsAt, onExpire) {
  const target = new Date(endsAt).getTime();
  const [sisa, setSisa] = useState(() => target - sekarang());
  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire; // selalu pakai callback terbaru tanpa nge-reset timer
  });

  useEffect(() => {
    const id = setInterval(() => {
      const s = target - sekarang();
      setSisa(s);
      if (s <= 0) {
        clearInterval(id);
        expireRef.current?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  const total = Math.max(0, Math.floor(sisa / 1000));
  return {
    habis: sisa <= 0,
    sisa,
    hari: Math.floor(total / 86400),
    jam: Math.floor((total % 86400) / 3600),
    menit: Math.floor((total % 3600) / 60),
    detik: total % 60,
  };
}

// Kotak-kotak angka besar: [HARI] JAM : MENIT : DETIK
function KotakWaktu({ hari, jam, menit, detik, kecil = false }) {
  const item = [
    ...(hari > 0 ? [{ n: hari, l: "Hari" }] : []),
    { n: jam, l: "Jam" }, { n: menit, l: "Menit" }, { n: detik, l: "Detik" },
  ];
  return (
    <div className="flex items-start gap-1.5" aria-label="Sisa waktu">
      {item.map((x, i) => (
        <div key={x.l} className="flex items-start gap-1.5">
          <div className={`bg-black/85 text-white rounded-lg text-center ${kecil ? "px-1.5 py-1 min-w-[34px]" : "px-2.5 py-1.5 min-w-[50px]"}`}>
            <p className={`font-black tabular-nums leading-none ${kecil ? "text-sm" : "text-xl md:text-2xl"}`}>{pad(x.n)}</p>
            <p className={`uppercase tracking-wide text-white/60 ${kecil ? "text-[8px] mt-0.5" : "text-[9px] mt-1"}`}>{x.l}</p>
          </div>
          {i < item.length - 1 && <span className={`font-black text-white/90 ${kecil ? "text-sm pt-1" : "text-xl pt-2"}`}>:</span>}
        </div>
      ))}
    </div>
  );
}

// Banner besar di atas daftar produk.
export function FlashSaleBanner({ endsAt, jumlahProduk, diskonMaks, onExpire }) {
  const w = useSisaWaktu(endsAt, onExpire);
  if (w.habis) return null;
  const label = w.sisa <= 72 * 3600 * 1000 ? "FLASH SALE" : "PROMO SPESIAL";
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6 text-white shadow-lg" style={{ background: GRADIEN_FLASH }}>
      <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute right-24 -bottom-12 w-28 h-28 rounded-full bg-white/10" />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Zap size={26} fill="currentColor" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-black tracking-tight leading-none">{label}</p>
            <p className="text-xs md:text-sm text-white/90 mt-1.5">
              {jumlahProduk} produk diskon sampai <b>{diskonMaks}%</b>
            </p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-widest text-white/85 font-semibold mb-1.5">Berakhir dalam</p>
          <KotakWaktu {...w} />
        </div>
      </div>
    </div>
  );
}

// Strip tipis yang ikut nempel (sticky) di bawah nav — tetap kelihatan pas scroll.
export function FlashSaleStrip({ endsAt, onExpire }) {
  const w = useSisaWaktu(endsAt, onExpire);
  if (w.habis) return null;
  const teks = `${w.hari > 0 ? `${w.hari}h ` : ""}${pad(w.jam)}:${pad(w.menit)}:${pad(w.detik)}`;
  return (
    <div className="flex items-center justify-center gap-2 py-1.5 px-3 text-white text-xs font-bold" style={{ background: GRADIEN_FLASH }}>
      <Zap size={13} fill="currentColor" />
      <span className="uppercase tracking-wide">Flash Sale berakhir dalam</span>
      <span className="font-mono tabular-nums bg-black/30 rounded px-1.5 py-0.5">{teks}</span>
    </div>
  );
}

// Chip countdown di dalam kartu produk / modal.
export function ChipCountdown({ endsAt, onExpire, className = "" }) {
  const w = useSisaWaktu(endsAt, onExpire);
  if (w.habis) return null;
  const teks = `${w.hari > 0 ? `${w.hari}h ` : ""}${pad(w.jam)}:${pad(w.menit)}:${pad(w.detik)}`;
  return (
    <div className={`flex items-center justify-center gap-1.5 text-white text-[11px] font-bold py-1.5 ${className}`} style={{ background: GRADIEN_FLASH }}>
      <Zap size={12} fill="currentColor" />
      <span>Berakhir</span>
      <span className="font-mono tabular-nums">{teks}</span>
    </div>
  );
}
