"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Clock } from "lucide-react";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const HARI_PANJANG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const WIB_MS = 7 * 3600 * 1000;
const PERIODE_HARI = 90;
const MIN_TRANSAKSI = 10; // di bawah ini pola belum bisa dipercaya
const STATUS_BAYAR = ["paid", "shipped", "selesai"];

const pad = (n) => String(n).padStart(2, "0");
const rupiah = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");

// "Jam emas": kapan pembeli paling sering BAYAR, dari data order yang udah ada.
// Pakai paid_at (waktu uang masuk), dikonversi ke WIB, dihitung per transaksi
// (bukan per baris produk).
export default function JamEmas({ store }) {
  const [trx, setTrx] = useState([]); // [{ ts, total }]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function muat() {
      const sejak = new Date(Date.now() - PERIODE_HARI * 24 * 3600 * 1000).toISOString();
      const semua = [];
      // Supabase membatasi 1000 baris per request -> ambil bertahap (maks 5000 baris)
      for (let from = 0; from < 5000; from += 1000) {
        const { data, error } = await supabase.from("orders")
          .select("midtrans_order_id, id, paid_at, total_price, status")
          .eq("store_id", store.id).in("status", STATUS_BAYAR)
          .not("paid_at", "is", null).gte("paid_at", sejak)
          .order("paid_at", { ascending: true }).range(from, from + 999);
        if (error || !data) break;
        semua.push(...data);
        if (data.length < 1000) break;
      }
      const peta = new Map();
      for (const o of semua) {
        const key = o.midtrans_order_id || o.id;
        const ada = peta.get(key);
        if (ada) ada.total += Number(o.total_price);
        else peta.set(key, { ts: new Date(o.paid_at).getTime(), total: Number(o.total_price) });
      }
      setTrx(Array.from(peta.values()));
      setLoading(false);
    }
    muat();
  }, [store.id]);

  const analisis = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    const perJam = Array(24).fill(0);
    const perHari = Array(7).fill(0);
    for (const t of trx) {
      const d = new Date(t.ts + WIB_MS); // geser ke WIB, baca pakai getUTC*
      const h = d.getUTCHours(), w = d.getUTCDay();
      grid[w][h] += 1; perJam[h] += 1; perHari[w] += 1;
    }
    const maks = Math.max(...grid.flat(), 1);
    const topJam = perJam.map((n, h) => ({ h, n })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
    const topHari = perHari.map((n, w) => ({ w, n })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)[0];
    return { grid, maks, topJam, topHari, total: trx.length, omzet: trx.reduce((s, t) => s + t.total, 0) };
  }, [trx]);

  const warna = (n) => {
    if (n === 0) return "#F1EFE8";
    const a = 0.2 + 0.8 * (n / analisis.maks);
    return `rgba(216, 90, 48, ${a.toFixed(2)})`;
  };
  const sedikit = analisis.total < MIN_TRANSAKSI;

  return (
    <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-[#1C1C1A] flex items-center gap-2"><Clock size={16} className="text-[#D85A30]" /> Jam emas jualan</h3>
        <span className="text-xs text-[#8B8D85]">{PERIODE_HARI} hari terakhir · WIB</span>
      </div>
      <p className="text-xs text-[#8B8D85] mb-4">Kapan pembeli paling sering bayar. Pasang promo & posting konten sebelum jam-jam ini.</p>

      {loading ? (
        <p className="text-sm text-[#8B8D85]">Memuat data...</p>
      ) : analisis.total === 0 ? (
        <p className="text-sm text-[#8B8D85] text-center py-6">Belum ada transaksi berbayar. Jam emas muncul setelah ada penjualan.</p>
      ) : (
        <>
          {sedikit && (
            <p className="text-xs bg-[#FAEEDA] text-[#854F0B] rounded-lg px-3 py-2 mb-4">
              Baru {analisis.total} transaksi — pola di bawah masih kasar. Makin banyak data, makin akurat (idealnya {MIN_TRANSAKSI}+ transaksi).
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {analisis.topJam.map((x, i) => (
              <div key={x.h} className={`rounded-xl p-3 ${i === 0 ? "bg-[#FAECE7]" : "bg-[#FAFAF7] border border-[#E5E2D9]"}`}>
                <p className="text-[11px] text-[#8B8D85]">{i === 0 ? "🏆 Jam terbaik" : `#${i + 1}`}</p>
                <p className="text-lg font-bold text-[#1C1C1A]">{pad(x.h)}:00–{pad(x.h)}:59</p>
                <p className="text-xs text-[#5B6472]">{x.n} transaksi</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="flex ml-9 mb-1">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="flex-1 text-center text-[9px] text-[#8B8D85]">{h % 3 === 0 ? pad(h) : ""}</div>
                ))}
              </div>
              {[1, 2, 3, 4, 5, 6, 0].map((w) => (
                <div key={w} className="flex items-center mb-[3px]">
                  <span className="w-9 text-[11px] text-[#5B6472] shrink-0">{HARI[w]}</span>
                  {analisis.grid[w].map((n, h) => (
                    <div key={h} title={`${HARI_PANJANG[w]} ${pad(h)}:00 — ${n} transaksi`}
                      className="flex-1 h-5 mx-[1px] rounded-[3px]" style={{ background: warna(n) }} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-[#1C1C1A] mt-4 leading-relaxed">
            💡 {analisis.topHari && <>Hari paling ramai: <b>{HARI_PANJANG[analisis.topHari.w]}</b>. </>}
            Coba posting 30–60 menit sebelum <b>{pad(analisis.topJam[0].h)}:00</b> supaya link toko masuk saat pembeli lagi aktif.
            <span className="text-[#8B8D85]"> ({analisis.total} transaksi · {rupiah(analisis.omzet)})</span>
          </p>
        </>
      )}
    </div>
  );
}
