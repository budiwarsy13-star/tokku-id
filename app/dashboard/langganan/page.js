"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Crown, Check, X as XIcon, Sparkles } from "lucide-react";
import { planAktif, sisaHariLangganan, FITUR_BERBAYAR, BATAS_GRATIS } from "@/lib/plan";

// Harga langganan masih dalam tahap riset (lihat tokku-kalkulator-harga.xlsx).
// Sengaja ditaruh di SATU tempat ini aja (bukan di lib/plan.js, yang memang
// sengaja gak nyimpen harga) biar gampang diubah pas harga final udah
// ditentuin -- tinggal ganti angka di bawah ini.
const HARGA_LANGGANAN_PLACEHOLDER = 130000; // Rp / bulan -- PLACEHOLDER, belum final

// Belum ada payment flow otomatis buat langganan (nunggu harga final), jadi
// upgrade sementara lewat WhatsApp manual ke admin. Ganti nomor ini ke nomor
// WA admin tokku.id yang asli -- bisa juga dipindah ke env
// NEXT_PUBLIC_ADMIN_WA kalau mau diatur tanpa ubah kode.
const ADMIN_WA = process.env.NEXT_PUBLIC_ADMIN_WA || "6281234567890";

const DAFTAR_FITUR = [
  { label: "Jumlah produk", gratis: `Maks ${BATAS_GRATIS.produkMaks}`, berbayar: "Tanpa batas" },
  { label: "Kode diskon aktif", gratis: `Maks ${BATAS_GRATIS.kodeDiskonAktifMaks}`, berbayar: "Tanpa batas" },
  { label: "Promo flash sale aktif", gratis: `Maks ${BATAS_GRATIS.promoAktifMaks}`, berbayar: "Tanpa batas" },
  { label: "Promo terjadwal (mulai di masa depan)", kunci: FITUR_BERBAYAR.PROMO_TERJADWAL },
  { label: "Import produk massal (bulk import)", kunci: FITUR_BERBAYAR.BULK_IMPORT },
  { label: "Jam Emas (jadwal posting otomatis)", kunci: FITUR_BERBAYAR.JAM_EMAS },
  { label: "AI Copywriter (kuota lebih banyak)", kunci: FITUR_BERBAYAR.AI_COPYWRITER_LEBIH },
  { label: "Insight AI harian", gratis: "Ringkasan mingguan", berbayar: "Ringkasan harian" },
  { label: "Tracking UTM", kunci: FITUR_BERBAYAR.UTM },
  { label: "Pixel Meta & GA4 (server-side tracking)", kunci: FITUR_BERBAYAR.PIXEL_TRACKING },
  { label: "WA Blast ke pembeli lama", kunci: FITUR_BERBAYAR.WA_BLAST },
  { label: "Cart recovery via WA", kunci: FITUR_BERBAYAR.CART_RECOVERY_WA },
];

function formatTanggal(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function LanggananPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      setLoading(false);
    }
    init();
  }, []);

  if (loading || !store) {
    return (
      <DashboardLayout store={store} activeMenu="/dashboard/langganan" headerTitle="Langganan">
        <p className="text-sm text-[#8B8D85]">Memuat...</p>
      </DashboardLayout>
    );
  }

  const aktif = planAktif(store);
  const sisaHari = sisaHariLangganan(store);

  const pesanWA = aktif
    ? `Halo admin tokku.id, saya mau perpanjang langganan toko "${store.name}" (${store.slug}).`
    : `Halo admin tokku.id, saya mau upgrade ke paket berbayar untuk toko "${store.name}" (${store.slug}).`;
  const linkWA = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(pesanWA)}`;

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/langganan" headerTitle="Langganan">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Status paket saat ini */}
        <div className="bg-white rounded-2xl border border-[#E5E2D9] p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${aktif ? "bg-[#FFF4D6]" : "bg-[#F1EFE8]"}`}>
                <Crown size={22} className={aktif ? "text-[#B8860B]" : "text-[#8B8D85]"} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs text-[#8B8D85]">Paket kamu sekarang</p>
                <h2 className="text-lg font-bold text-[#1C1C1A]">
                  {aktif ? "Berbayar" : "Gratis"}
                </h2>
              </div>
            </div>
            {aktif && (
              <div className="text-right">
                <p className="text-xs text-[#8B8D85]">Aktif sampai</p>
                <p className="text-sm font-semibold text-[#1C1C1A]">{formatTanggal(store.plan_aktif_sampai)}</p>
                <p className="text-xs text-[#3B6D11] mt-0.5">{sisaHari} hari lagi</p>
              </div>
            )}
          </div>

          {!aktif && (
            <p className="text-sm text-[#5B6472] mt-4">
              Kamu masih pakai paket gratis. Beberapa fitur (WA Blast, tracking Pixel/GA4, promo terjadwal, dan lainnya) butuh paket berbayar buat dipakai.
            </p>
          )}
        </div>

        {/* Perbandingan fitur */}
        <div className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E2D9]">
            <h3 className="font-bold text-[#1C1C1A]">Perbandingan paket</h3>
            <p className="text-xs text-[#8B8D85] mt-0.5">Harga final masih dalam riset, jadi angka di bawah ini sementara dan bisa berubah.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF7] text-[#5B6472] text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3 font-medium">Fitur</th>
                  <th className="text-center px-4 py-3 font-medium">Gratis</th>
                  <th className="text-center px-4 py-3 font-medium">Berbayar</th>
                </tr>
              </thead>
              <tbody>
                {DAFTAR_FITUR.map((f) => (
                  <tr key={f.label} className="border-t border-[#F1EFE8]">
                    <td className="px-6 py-3 text-[#1C1C1A]">{f.label}</td>
                    <td className="px-4 py-3 text-center text-[#5B6472]">
                      {f.kunci ? <XIcon size={16} className="inline text-[#C9A227]" /> : f.gratis}
                    </td>
                    <td className="px-4 py-3 text-center text-[#1C1C1A] font-medium">
                      {f.kunci ? <Check size={16} className="inline text-[#3B6D11]" /> : f.berbayar}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA upgrade */}
        <div className="bg-gradient-to-br from-[#1C1C1A] to-[#3A362E] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-[#FFD36A]" />
            <p className="text-xs uppercase tracking-wider text-[#C9C5B8]">Paket Berbayar</p>
          </div>
          <p className="text-2xl font-bold mb-1">
            Rp{HARGA_LANGGANAN_PLACEHOLDER.toLocaleString("id-ID")}
            <span className="text-sm font-normal text-[#C9C5B8]"> / bulan (perkiraan)</span>
          </p>
          <p className="text-sm text-[#C9C5B8] mb-4">
            {aktif
              ? "Mau perpanjang sebelum masa aktif habis? Chat admin, langganan kamu langsung diperpanjang."
              : "Harga masih sementara sambil kami finalisasi. Chat admin buat info lengkap dan cara aktivasi."}
          </p>
          <a
            href={linkWA}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-[#1C1C1A] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#F1EFE8] transition-colors"
          >
            {aktif ? "Perpanjang lewat WhatsApp" : "Upgrade lewat WhatsApp"}
          </a>
        </div>

      </div>
    </DashboardLayout>
  );
}
