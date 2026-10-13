"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { promoAktif, hargaPromo, statusPromo } from "@/lib/promo";
import { Loader2, Search, Flame, AlertTriangle, Check } from "lucide-react";

function rupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}
// Nilai untuk <input type="datetime-local"> (jam lokal browser seller)
function keInputLokal(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
function tampilWaktu(iso) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Tanggal jauh di depan, cuma buat simulasi "harga setelah promo" di daftar (bukan data asli)
const AKHIR_SIMULASI = "2999-01-01T00:00:00.000Z";

const DURASI = [
  { label: "3 jam", jam: 3 },
  { label: "1 hari", jam: 24 },
  { label: "3 hari", jam: 72 },
  { label: "7 hari", jam: 168 },
];
const STATUS_STYLE = {
  aktif: { label: "Aktif", cls: "bg-[#FCEBEB] text-[#A32D2D]" },
  terjadwal: { label: "Terjadwal", cls: "bg-[#E6F1FB] text-[#185FA5]" },
  berakhir: { label: "Berakhir", cls: "bg-[#F1EFE8] text-[#5B6472]" },
};

export default function PromoPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [dipilih, setDipilih] = useState(new Set());
  const [persen, setPersen] = useState(20);
  const [mulai, setMulai] = useState(() => keInputLokal(new Date()));
  const [selesai, setSelesai] = useState(() => keInputLokal(new Date(Date.now() + 24 * 3600 * 1000)));
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState(null); // { tipe: "ok" | "err", teks }

  async function muatProduk(storeId) {
    const { data } = await supabase.from("products").select("*").eq("store_id", storeId).order("name", { ascending: true });
    setProducts(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      await muatProduk(storeData.id);
      setLoading(false);
    }
    init();
  }, []);

  const tampil = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name?.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const promoBerjalan = useMemo(
    () => products.filter((p) => statusPromo(p) !== "tidak_ada" && statusPromo(p) !== "berakhir"),
    [products]
  );

  function toggle(id) {
    setDipilih((prev) => { const b = new Set(prev); b.has(id) ? b.delete(id) : b.add(id); return b; });
  }
  function toggleSemua(cek) {
    setDipilih(cek ? new Set(tampil.map((p) => p.id)) : new Set());
  }
  function setDurasi(jam) {
    const awal = new Date(mulai);
    const dasar = Number.isNaN(awal.getTime()) ? new Date() : awal;
    setSelesai(keInputLokal(new Date(dasar.getTime() + jam * 3600 * 1000)));
  }

  // Peringatan kalau harga promo jatuh di bawah modal (HPP) — hanya produk tanpa varian.
  function dibawahModal(p) {
    if (!p.hpp || (p.variants || []).length) return false;
    const fake = { promo_percent: persen, promo_starts_at: null, promo_ends_at: AKHIR_SIMULASI };
    return hargaPromo(p.price, fake) < p.hpp;
  }

  async function terapkan() {
    setPesan(null);
    const pct = Number(persen);
    const tMulai = new Date(mulai);
    const tSelesai = new Date(selesai);
    if (dipilih.size === 0) return setPesan({ tipe: "err", teks: "Pilih minimal 1 produk dulu." });
    if (!Number.isInteger(pct) || pct < 1 || pct > 95) return setPesan({ tipe: "err", teks: "Diskon harus angka bulat 1–95%." });
    if (Number.isNaN(tMulai.getTime()) || Number.isNaN(tSelesai.getTime())) return setPesan({ tipe: "err", teks: "Tanggal mulai/selesai belum valid." });
    if (tSelesai <= tMulai) return setPesan({ tipe: "err", teks: "Waktu selesai harus setelah waktu mulai." });
    if (tSelesai <= new Date()) return setPesan({ tipe: "err", teks: "Waktu selesai sudah lewat." });

    setMenyimpan(true);
    const { error } = await supabase.from("products")
      .update({ promo_percent: pct, promo_starts_at: tMulai.toISOString(), promo_ends_at: tSelesai.toISOString() })
      .in("id", Array.from(dipilih))
      .eq("store_id", store.id);
    setMenyimpan(false);
    if (error) return setPesan({ tipe: "err", teks: "Gagal menyimpan: " + error.message });
    await muatProduk(store.id);
    setDipilih(new Set());
    setPesan({ tipe: "ok", teks: `Promo ${pct}% dipasang di ${dipilih.size} produk.` });
  }

  async function hentikan(ids) {
    const { error } = await supabase.from("products")
      .update({ promo_percent: null, promo_starts_at: null, promo_ends_at: null })
      .in("id", ids).eq("store_id", store.id);
    if (error) return setPesan({ tipe: "err", teks: "Gagal menghentikan: " + error.message });
    await muatProduk(store.id);
    setPesan({ tipe: "ok", teks: "Promo dihentikan." });
  }

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/promo" headerTitle="Promo & Countdown">
      <div className="max-w-4xl space-y-6">
        {pesan && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${pesan.tipe === "ok" ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FCEBEB] text-[#A32D2D]"}`}>
            {pesan.tipe === "ok" ? <Check size={16} /> : <AlertTriangle size={16} />} {pesan.teks}
          </div>
        )}

        {/* PROMO BERJALAN */}
        {promoBerjalan.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#1C1C1A] flex items-center gap-2"><Flame size={17} className="text-[#D85A30]" /> Promo berjalan & terjadwal</h2>
              <button onClick={() => hentikan(promoBerjalan.map((p) => p.id))} className="text-xs text-[#A32D2D] hover:underline">Hentikan semua</button>
            </div>
            <div className="divide-y divide-[#F1EFE8]">
              {promoBerjalan.map((p) => {
                const st = STATUS_STYLE[statusPromo(p)];
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="text-[#1C1C1A] truncate">{p.name}</p>
                      <p className="text-xs text-[#8B8D85]">
                        {rupiah(p.price)} → {rupiah(hargaPromo(p.price, { ...p, promo_starts_at: null }, new Date(p.promo_ends_at).getTime() - 1))} · {tampilWaktu(p.promo_starts_at || p.created_at)} s/d {tampilWaktu(p.promo_ends_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-[#A32D2D]">-{p.promo_percent}%</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                      <button onClick={() => hentikan([p.id])} className="text-xs text-[#8B8D85] hover:text-[#A32D2D]">Stop</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PASANG PROMO BARU */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 space-y-4">
          <h2 className="font-bold text-[#1C1C1A]">Pasang promo baru</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-[#5B6472]">Diskon (%)
              <input type="number" min={1} max={95} value={persen} onChange={(e) => setPersen(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
            </label>
            <label className="text-xs text-[#5B6472]">Mulai
              <input type="datetime-local" value={mulai} onChange={(e) => setMulai(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
            </label>
            <label className="text-xs text-[#5B6472]">Selesai
              <input type="datetime-local" value={selesai} onChange={(e) => setSelesai(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#8B8D85] mr-1">Durasi cepat:</span>
            {DURASI.map((d) => (
              <button key={d.jam} type="button" onClick={() => setDurasi(d.jam)}
                className="text-xs px-2.5 py-1 rounded-full border border-[#E5E2D9] text-[#5B6472] hover:bg-[#F1EFE8]">{d.label}</button>
            ))}
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8D85]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..."
              className="w-full pl-9 pr-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>

          <div className="border border-[#E5E2D9] rounded-xl divide-y divide-[#F1EFE8] max-h-[360px] overflow-y-auto">
            <label className="flex items-center gap-3 px-3 py-2 text-xs text-[#5B6472] bg-[#FAFAF7] sticky top-0">
              <input type="checkbox" checked={tampil.length > 0 && tampil.every((p) => dipilih.has(p.id))} onChange={(e) => toggleSemua(e.target.checked)} />
              Pilih semua ({tampil.length})
            </label>
            {tampil.length === 0 && <p className="text-sm text-[#8B8D85] text-center py-6">Belum ada produk.</p>}
            {tampil.map((p) => {
              const pilih = dipilih.has(p.id);
              const fake = { promo_percent: Number(persen), promo_starts_at: null, promo_ends_at: AKHIR_SIMULASI };
              return (
                <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-[#FAFAF7]">
                  <input type="checkbox" checked={pilih} onChange={() => toggle(p.id)} />
                  <span className="flex-1 min-w-0 truncate text-[#1C1C1A]">{p.name}</span>
                  {(p.variants || []).length > 0 && <span className="text-[10px] text-[#8B8D85]">semua varian</span>}
                  {promoAktif(p) && <span className="text-[10px] bg-[#FCEBEB] text-[#A32D2D] px-1.5 py-0.5 rounded-full">sudah promo</span>}
                  <span className="text-xs text-[#8B8D85] shrink-0">
                    {pilih && persen >= 1 ? <>{rupiah(p.price)} → <b className="text-[#1C1C1A]">{rupiah(hargaPromo(p.price, fake))}</b></> : rupiah(p.price)}
                  </span>
                  {pilih && dibawahModal(p) && <span title="Harga promo di bawah modal (HPP)"><AlertTriangle size={14} className="text-[#BA7517]" /></span>}
                </label>
              );
            })}
          </div>

          <button onClick={terapkan} disabled={menyimpan}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#D85A30] text-white text-sm font-medium hover:bg-[#B84A25] disabled:opacity-50 flex items-center justify-center gap-2">
            {menyimpan && <Loader2 size={15} className="animate-spin" />}
            Terapkan promo{dipilih.size > 0 ? ` (${dipilih.size} produk)` : ""}
          </button>
          <p className="text-xs text-[#8B8D85]">
            Harga promo otomatis berlaku di halaman toko dan checkout, lengkap dengan hitung mundur. Setelah waktu selesai, harga balik normal sendiri — gak perlu dimatikan manual.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
