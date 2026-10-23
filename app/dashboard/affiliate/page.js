"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Link2, Info, Lock } from "lucide-react";
import { bolehPakaiFitur, FITUR_BERBAYAR } from "@/lib/plan";

const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
const tgl = (d) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
const STATUS = {
  pending:  { teks: "Menunggu", cls: "bg-[#FFF4D6] text-[#B8860B]" },
  terkunci: { teks: "Terkunci", cls: "bg-[#E6F1FB] text-[#0C447C]" },
  dibayar:  { teks: "Dibayar",  cls: "bg-[#EAF3DE] text-[#3B6D11]" },
  batal:    { teks: "Batal",    cls: "bg-[#FCEBEB] text-[#A32D2D]" },
};

export default function AffiliateSellerPage() {
  const [store, setStore] = useState(null);
  const [produk, setProduk] = useState([]);
  const [komisi, setKomisi] = useState([]);
  const [draft, setDraft] = useState({}); // { [productId]: "10" }
  const [massal, setMassal] = useState("");
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState("");
  const [galat, setGalat] = useState("");

  const muat = useCallback(async (storeId) => {
    const [{ data: p }, { data: k }] = await Promise.all([
      supabase.from("products").select("id, name, price, affiliate_commission_percent").eq("store_id", storeId).order("created_at", { ascending: false }),
      supabase.from("affiliate_commissions").select("id, ref_code, product_name, base_amount, percent, amount, status, created_at")
        .eq("store_id", storeId).order("created_at", { ascending: false }).limit(200),
    ]);
    setProduk(p || []);
    setKomisi(k || []);
    setDraft(Object.fromEntries((p || []).map((x) => [x.id, x.affiliate_commission_percent == null ? "" : String(x.affiliate_commission_percent)])));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: s } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!s) { window.location.href = "/dashboard"; return; }
      setStore(s);
      await muat(s.id);
      setLoading(false);
    })();
  }, [muat]);

  function nilaiValid(v) {
    if (v === "" || v == null) return { ok: true, nilai: null };
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n) || n < 1 || n > 50) return { ok: false };
    return { ok: true, nilai: Math.round(n * 100) / 100 };
  }

  async function simpan(ids) {
    setPesan(""); setGalat("");
    const batch = [];
    for (const id of ids) {
      const v = nilaiValid(draft[id]);
      if (!v.ok) { setGalat("Persen komisi harus 1 sampai 50 (kosongkan untuk mematikan)."); return; }
      batch.push({ id, nilai: v.nilai });
    }
    for (const b of batch) {
      const { error } = await supabase.from("products").update({ affiliate_commission_percent: b.nilai }).eq("id", b.id).eq("store_id", store.id);
      if (error) { setGalat("Gagal menyimpan: " + error.message); return; }
    }
    setPesan(batch.length > 1 ? `${batch.length} produk diperbarui.` : "Tersimpan.");
    await muat(store.id);
  }

  async function terapkanSemua() {
    const v = nilaiValid(massal);
    if (!v.ok) { setGalat("Persen komisi harus 1 sampai 50 (kosongkan untuk mematikan)."); return; }
    setDraft(Object.fromEntries(produk.map((p) => [p.id, massal])));
    setPesan(""); setGalat("");
    for (const p of produk) {
      const { error } = await supabase.from("products").update({ affiliate_commission_percent: v.nilai }).eq("id", p.id).eq("store_id", store.id);
      if (error) { setGalat("Gagal menyimpan: " + error.message); return; }
    }
    setPesan(`Komisi ${v.nilai == null ? "dimatikan" : v.nilai + "%"} diterapkan ke ${produk.length} produk.`);
    await muat(store.id);
  }

  if (loading) return <DashboardLayout store={store} activeMenu="/dashboard/affiliate" headerTitle="Affiliate"><p className="text-sm text-[#8B8D85]">Memuat...</p></DashboardLayout>;

  const hitung = (st) => komisi.filter((k) => k.status === st).reduce((s, k) => s + Number(k.amount), 0);
  const aktifKomisi = komisi.filter((k) => k.status !== "batal");
  const omzet = aktifKomisi.reduce((s, k) => s + Number(k.base_amount), 0);
  const boleh = bolehPakaiFitur(store, FITUR_BERBAYAR.AFFILIATE);
  const jumlahProdukAktif = produk.filter((p) => p.affiliate_commission_percent != null).length;

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/affiliate" headerTitle="Affiliate">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex gap-3 bg-[#FAECE7] rounded-2xl px-4 py-3 text-sm text-[#5B6472]">
          <Link2 size={18} className="text-[#D85A30] flex-shrink-0 mt-0.5" />
          <p>
            Atur komisi per produk, dan produk itu otomatis muncul di etalase Tokku Affiliate. Kamu cuma bayar komisi kalau ada pesanan yang <strong>selesai</strong> lewat link affiliate. Komisi dihitung dari harga barang setelah diskon, tanpa ongkir.
          </p>
        </div>

        {!boleh && (
          <div className="flex items-start gap-3 bg-white border border-[#E5E2D9] rounded-2xl px-5 py-4">
            <Lock size={20} className="text-[#D85A30] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-[#1C1C1A]">Program affiliate khusus paket berbayar</p>
              <p className="text-[#5B6472] mt-0.5">Upgrade untuk mengaktifkan komisi di produkmu dan tampil di etalase affiliator. Komisi yang sudah tercatat tetap aman.</p>
              <a href="/dashboard/langganan" className="inline-block mt-2 text-[#D85A30] font-medium hover:underline">Lihat paket →</a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[["Produk ikut program", `${jumlahProdukAktif}/${produk.length}`], ["Omzet via affiliate", rp(omzet)], ["Komisi menunggu", rp(hitung("pending"))], ["Komisi terkunci + dibayar", rp(hitung("terkunci") + hitung("dibayar"))]].map(([n, v]) => (
            <div key={n} className="bg-white border border-[#E5E2D9] rounded-2xl p-4">
              <p className="text-xs text-[#8B8D85]">{n}</p>
              <p className="text-lg font-bold">{v}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E5E2D9] rounded-2xl">
          <div className="px-5 py-4 border-b border-[#E5E2D9] flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Komisi per produk</h2>
            <div className="flex items-center gap-2">
              <input disabled={!boleh} value={massal} onChange={(e) => setMassal(e.target.value)} inputMode="decimal" placeholder="%" className="w-16 border border-[#E5E2D9] rounded-lg px-2 py-1.5 text-sm text-center" />
              <button onClick={terapkanSemua} disabled={!boleh} className="text-sm text-[#D85A30] bg-[#FAECE7] px-3 py-1.5 rounded-lg hover:bg-[#F5D8CD] disabled:opacity-40">Terapkan ke semua</button>
            </div>
          </div>
          {(pesan || galat) && <p className={`px-5 pt-3 text-sm ${galat ? "text-[#A32D2D]" : "text-[#3B6D11]"}`}>{galat || pesan}</p>}
          {produk.length === 0 ? <p className="p-5 text-sm text-[#8B8D85]">Belum ada produk.</p> : (
            <ul>
              {produk.map((p) => {
                const v = nilaiValid(draft[p.id]);
                const berubah = String(p.affiliate_commission_percent ?? "") !== String(draft[p.id] ?? "");
                return (
                  <li key={p.id} className="px-5 py-3 border-t border-[#F1EFE8] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-[#8B8D85]">
                        {rp(p.price)}{v.ok && v.nilai ? ` · komisi ≈ ${rp(Math.floor((p.price * v.nilai) / 100))}/unit` : " · tidak ikut program"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input disabled={!boleh} value={draft[p.id] ?? ""} onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })} inputMode="decimal" placeholder="off"
                        className={`w-16 border rounded-lg px-2 py-1.5 text-sm text-center ${v.ok ? "border-[#E5E2D9]" : "border-[#A32D2D]"}`} />
                      <span className="text-sm text-[#8B8D85]">%</span>
                      <button disabled={!berubah || !boleh} onClick={() => simpan([p.id])} className="text-sm bg-[#D85A30] text-white px-3 py-1.5 rounded-lg disabled:opacity-30">Simpan</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white border border-[#E5E2D9] rounded-2xl">
          <div className="px-5 py-4 border-b border-[#E5E2D9]"><h2 className="font-bold">Komisi terbaru</h2></div>
          {komisi.length === 0 ? <p className="p-5 text-sm text-[#8B8D85]">Belum ada pesanan lewat affiliate.</p> : (
            <ul>
              {komisi.slice(0, 30).map((k) => (
                <li key={k.id} className="px-5 py-3 border-t border-[#F1EFE8] flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{k.product_name}</p>
                    <p className="text-xs text-[#8B8D85]">{tgl(k.created_at)} · {k.ref_code} · {rp(k.base_amount)} × {Number(k.percent)}%</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold">{rp(k.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${STATUS[k.status]?.cls}`}>{STATUS[k.status]?.teks}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-[#8B8D85] flex gap-1.5"><Info size={14} className="flex-shrink-0 mt-px" /> Persen komisi dikunci saat pesanan dibuat. Mengubahnya hanya berlaku untuk pesanan berikutnya.</p>
      </div>
    </DashboardLayout>
  );
}
