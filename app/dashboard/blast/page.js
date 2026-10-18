"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Send, ShieldCheck, AlertTriangle, Check } from "lucide-react";
import KunciFitur from "@/components/KunciFitur";

const SEGMEN = [
  { key: "semua", judul: "Semua pembeli", desc: "Semua yang pernah bayar di tokomu" },
  { key: "repeat", judul: "Pelanggan setia", desc: "Sudah beli 2x atau lebih" },
  { key: "diam", judul: "Lama gak balik", desc: "Terakhir beli lebih dari 60 hari lalu" },
];
const TEMPLATE = [
  { label: "Promo", teks: "Halo {nama}! 👋 Ada promo spesial dari {toko} khusus buat kamu. Cek produk & diskonnya di sini ya: {link}" },
  { label: "Produk baru", teks: "Halo {nama}! Koleksi baru udah masuk di {toko} 🔥 Kamu yang pertama tahu. Lihat di sini: {link}" },
  { label: "Kangen", teks: "Halo {nama}, udah lama gak mampir ke {toko} 😊 Ada yang baru nih, yuk intip: {link}" },
];

function tampilWaktu(iso) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function BlastPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [segmen, setSegmen] = useState("semua");
  const [pesan, setPesan] = useState(TEMPLATE[0].teks);
  const [mengirim, setMengirim] = useState(false);
  const [hasil, setHasil] = useState(null); // { tipe, teks }

  async function panggil(payload) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/wa/blast", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
  async function muatInfo(storeId) {
    const [prev, rwy] = await Promise.all([
      panggil({ action: "preview" }),
      supabase.from("wa_blasts").select("id, segment, total_recipients, created_at").eq("store_id", storeId)
        .order("created_at", { ascending: false }).limit(5),
    ]);
    if (prev.success) setInfo(prev);
    setRiwayat(rwy.data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      await muatInfo(storeData.id);
      setLoading(false);
    }
    init();
  }, []);

  const jumlahSegmen = info?.jumlah?.[segmen] ?? 0;
  const akanDikirim = Math.min(jumlahSegmen, info?.maksPerBlast || 100);
  const cooldown = info?.bisaKirimLagiPada;
  const estimasiMenit = Math.ceil((akanDikirim * 27) / 60);

  const pratinjau = pesan
    .replace(/\{nama\}/gi, "Budi")
    .replace(/\{toko\}/gi, store?.name || "Toko")
    .replace(/\{link\}/gi, `tokku-id.vercel.app/${store?.slug}?ref=wablast`);

  async function kirim() {
    setHasil(null);
    if (!window.confirm(`Kirim pesan ke ${akanDikirim} pembeli? Tidak bisa dibatalkan, dan baru bisa blast lagi 24 jam kemudian.`)) return;
    setMengirim(true);
    const data = await panggil({ action: "send", segment: segmen, message: pesan });
    setMengirim(false);
    if (data.success) {
      setHasil({ tipe: "ok", teks: `Berhasil masuk antrean: ${data.terkirim} pesan. Dikirim bertahap (±${estimasiMenit} menit) dengan jeda acak.` });
      await muatInfo(store.id);
    } else {
      setHasil({ tipe: "err", teks: data.message || "Gagal mengirim." });
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/blast" headerTitle="WA Blast">
      <div className="max-w-3xl space-y-6">
        {hasil && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${hasil.tipe === "ok" ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FCEBEB] text-[#A32D2D]"}`}>
            {hasil.tipe === "ok" ? <Check size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />} {hasil.teks}
          </div>
        )}
        {info && !info.waSiap && (
          <div className="rounded-xl px-4 py-3 text-sm bg-[#FAEEDA] text-[#854F0B]">Layanan WA belum aktif di server (WA_API_KEY belum diisi).</div>
        )}

        {info && !info.pro && (
          <KunciFitur judul="WA Blast ke pembeli lama"
            deskripsi="Kamu bisa melihat jumlah pembeli di tiap segmen di bawah, tapi mengirim blast khusus Paket Pro." />
        )}

        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 space-y-3">
          <h2 className="font-bold text-[#1C1C1A]">1. Pilih penerima</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SEGMEN.map((s) => (
              <button key={s.key} onClick={() => setSegmen(s.key)} type="button"
                className={`text-left rounded-xl border p-3 transition-colors ${segmen === s.key ? "border-[#D85A30] bg-[#FAECE7]" : "border-[#E5E2D9] hover:bg-[#FAFAF7]"}`}>
                <p className="text-sm font-semibold text-[#1C1C1A]">{s.judul}</p>
                <p className="text-2xl font-black text-[#D85A30] my-0.5">{info?.jumlah?.[s.key] ?? 0}</p>
                <p className="text-[11px] text-[#8B8D85]">{s.desc}</p>
              </button>
            ))}
          </div>
          {jumlahSegmen > (info?.maksPerBlast || 100) && (
            <p className="text-xs text-[#854F0B]">Per blast maksimal {info.maksPerBlast} penerima (yang paling baru beli). Sisanya bisa di blast berikutnya.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 space-y-3">
          <h2 className="font-bold text-[#1C1C1A]">2. Tulis pesan</h2>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE.map((t) => (
              <button key={t.label} type="button" onClick={() => setPesan(t.teks)}
                className="text-xs px-2.5 py-1 rounded-full border border-[#E5E2D9] text-[#5B6472] hover:bg-[#F1EFE8]">{t.label}</button>
            ))}
          </div>
          <textarea value={pesan} onChange={(e) => setPesan(e.target.value)} rows={4} maxLength={700}
            className="w-full px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          <p className="text-xs text-[#8B8D85]">
            Kode otomatis: <code>{"{nama}"}</code> nama pembeli · <code>{"{toko}"}</code> nama tokomu · <code>{"{link}"}</code> link tokomu (otomatis ber-<code>?ref=wablast</code>, hasilnya kelihatan di &quot;Pesanan dari sumber mana&quot;).
          </p>
          <div className="bg-[#E7F5E1] rounded-xl p-3 text-sm text-[#1C1C1A] whitespace-pre-wrap">
            {pratinjau}
            <span className="block mt-3 text-[#5B6472]">Tidak mau menerima promo dari {store?.name} lagi? Klik:{"\n"}tokku-id.vercel.app/berhenti/…</span>
          </div>
          <p className="text-xs text-[#8B8D85] flex items-center gap-1.5"><ShieldCheck size={13} /> Link &quot;berhenti&quot; ditambahkan otomatis ke setiap pesan. {info?.jumlahBerhenti > 0 && <>Sudah ada {info.jumlahBerhenti} orang yang berhenti dan otomatis dilewati.</>}</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 space-y-3">
          <h2 className="font-bold text-[#1C1C1A]">3. Kirim</h2>
          {cooldown && (
            <p className="text-sm text-[#854F0B] bg-[#FAEEDA] rounded-lg px-3 py-2">Blast terakhir baru dikirim. Bisa kirim lagi mulai {tampilWaktu(cooldown)}.</p>
          )}
          <button onClick={kirim} disabled={mengirim || !!cooldown || akanDikirim === 0 || !info?.waSiap || !info?.pro}
            className="px-5 py-2.5 rounded-lg bg-[#D85A30] text-white text-sm font-medium hover:bg-[#B84A25] disabled:opacity-40 flex items-center gap-2">
            {mengirim ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Kirim ke {akanDikirim} pembeli
          </button>
          <p className="text-xs text-[#8B8D85]">
            Pesan dikirim bertahap dengan jeda acak 15–40 detik supaya nomor pengirim aman dari blokir WhatsApp. Maksimal 1 blast per 24 jam.
          </p>
        </div>

        {riwayat.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
            <h2 className="font-bold text-[#1C1C1A] mb-2">Riwayat blast</h2>
            <div className="divide-y divide-[#F1EFE8]">
              {riwayat.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-[#1C1C1A]">{SEGMEN.find((s) => s.key === r.segment)?.judul || r.segment}</span>
                  <span className="text-xs text-[#8B8D85]">{r.total_recipients} penerima · {tampilWaktu(r.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
