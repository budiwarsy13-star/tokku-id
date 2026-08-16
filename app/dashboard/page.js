"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import OnboardingGuide from "@/components/OnboardingGuide";
import PushOptIn from "@/components/PushOptIn";
import { Package, ShoppingBag, Wallet, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

function persenPerubahan(sekarang, kemarin) {
  if (kemarin === 0) return sekarang > 0 ? 100 : 0;
  return ((sekarang - kemarin) / kemarin) * 100;
}

function PerformaItem({ label, value, delta }) {
  const naik = delta > 0;
  const turun = delta < 0;
  return (
    <div>
      <p className="text-xs text-[#8B8D85] mb-1">{label}</p>
      <p className="text-lg font-bold text-[#1C1C1A]">{value}</p>
      <p className={`text-xs ${naik ? "text-[#3B6D11]" : turun ? "text-[#A32D2D]" : "text-[#8B8D85]"}`}>
        {naik ? "↑" : turun ? "↓" : "—"} {Math.abs(delta).toFixed(1)}%
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [namaToko, setNamaToko] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/masuk";
        return;
      }
      setUser(user);
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setStore(storeData);
      setLoading(false);
    }
    init();
  }, []);

  function handleNamaChange(e) {
    const val = e.target.value;
    setNamaToko(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"));
    setSlugStatus(null);
  }

  async function checkSlug() {
    if (!slug) return;
    const { data } = await supabase.from("stores").select("id").eq("slug", slug).maybeSingle();
    setSlugStatus(data ? "taken" : "available");
  }

  async function handleBuatToko(e) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from("stores")
      .insert({ user_id: user.id, name: namaToko, slug })
      .select()
      .single();
    setSaving(false);
    if (error) alert("Gagal bikin toko: " + error.message);
    else setStore(data);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <p className="text-[#8B8D85]">Memuat...</p>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6 font-[family-name:var(--font-baloo)]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="font-bold text-2xl tracking-tight text-[#1C1C1A]">
              tok<span className="text-[#D85A30]">k</span>u<span className="text-[#8B8D85] font-normal">.id</span>
            </span>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
            <h1 className="text-xl font-bold text-[#1C1C1A] mb-1">Bikin toko kamu</h1>
            <p className="text-sm text-[#8B8D85] mb-6">Satu langkah lagi sebelum mulai jualan.</p>
            <form onSubmit={handleBuatToko} className="space-y-4">
              <div>
                <label className="text-sm text-[#5B6472] block mb-1">Nama toko</label>
                <input type="text" required value={namaToko} onChange={handleNamaChange}
                  className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
                  placeholder="Toko Budi" />
              </div>
              <div>
                <label className="text-sm text-[#5B6472] block mb-1">Link toko</label>
                <div className="flex items-center border border-[#E5E2D9] rounded-lg overflow-hidden focus-within:border-[#D85A30]">
                  <span className="px-3 py-2 bg-[#F1EFE8] text-sm text-[#8B8D85]">tokku.id/</span>
                  <input type="text" required value={slug}
                    onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugStatus(null); }}
                    onBlur={checkSlug}
                    className="flex-1 px-2 py-2 text-sm focus:outline-none" placeholder="toko-budi" />
                </div>
                {slugStatus === "available" && <p className="text-xs text-[#3B6D11] mt-1">Link tersedia</p>}
                {slugStatus === "taken" && <p className="text-xs text-[#A32D2D] mt-1">Link sudah dipakai, coba yang lain</p>}
              </div>
              <button type="submit" disabled={saving || slugStatus === "taken"}
                className="w-full py-3 bg-[#D85A30] text-white rounded-lg font-medium hover:bg-[#B84A25] transition-colors disabled:opacity-50">
                {saving ? "Membuat..." : "Buat toko"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return <DashboardShell store={store} />;
}

function DashboardShell({ store }) {

  const [stats, setStats] = useState({ totalOrder: 0, totalPendapatan: 0, totalProduk: 0, produkTerlaris: [] });
  const [loadingStats, setLoadingStats] = useState(true);
  const [trenMingguan, setTrenMingguan] = useState([]);
  const [stokMenipis, setStokMenipis] = useState([]);
  const [pesananTerbaru, setPesananTerbaru] = useState([]);
  const [performa, setPerforma] = useState(null);

  useEffect(() => {
    async function fetchPerforma() {
      const awalHariIni = new Date(); awalHariIni.setHours(0, 0, 0, 0);
      const awalKemarin = new Date(awalHariIni); awalKemarin.setDate(awalKemarin.getDate() - 1);

      const [pengunjungHariIni, pengunjungKemarin, klikHariIni, klikKemarin, orderHariIni, orderKemarin] = await Promise.all([
        supabase.from("store_events").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("type", "view_toko").gte("created_at", awalHariIni.toISOString()),
        supabase.from("store_events").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("type", "view_toko").gte("created_at", awalKemarin.toISOString()).lt("created_at", awalHariIni.toISOString()),
        supabase.from("store_events").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("type", "klik_produk").gte("created_at", awalHariIni.toISOString()),
        supabase.from("store_events").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("type", "klik_produk").gte("created_at", awalKemarin.toISOString()).lt("created_at", awalHariIni.toISOString()),
        supabase.from("orders").select("id, total_price, status", { count: "exact" }).eq("store_id", store.id).gte("created_at", awalHariIni.toISOString()),
        supabase.from("orders").select("id, total_price, status", { count: "exact" }).eq("store_id", store.id).gte("created_at", awalKemarin.toISOString()).lt("created_at", awalHariIni.toISOString()),
      ]);

      const pengunjung = pengunjungHariIni.count || 0;
      const pengunjungY = pengunjungKemarin.count || 0;
      const klik = klikHariIni.count || 0;
      const klikY = klikKemarin.count || 0;
      const pesanan = orderHariIni.count || 0;
      const pesananY = orderKemarin.count || 0;
      const penjualan = (orderHariIni.data || []).filter((o) => o.status !== "pending").reduce((s, o) => s + Number(o.total_price), 0);
      const penjualanY = (orderKemarin.data || []).filter((o) => o.status !== "pending").reduce((s, o) => s + Number(o.total_price), 0);
      const konversi = pengunjung > 0 ? (pesanan / pengunjung) * 100 : 0;
      const konversiY = pengunjungY > 0 ? (pesananY / pengunjungY) * 100 : 0;

      setPerforma({
        penjualan, penjualanDelta: persenPerubahan(penjualan, penjualanY),
        pengunjung, pengunjungDelta: persenPerubahan(pengunjung, pengunjungY),
        klik, klikDelta: persenPerubahan(klik, klikY),
        pesanan, pesananDelta: persenPerubahan(pesanan, pesananY),
        konversi, konversiDelta: persenPerubahan(konversi, konversiY),
      });
    }
    fetchPerforma();
  }, [store.id]);

  useEffect(() => {
    async function fetchStats() {
      const { data: products } = await supabase
        .from("products").select("id, name, stock").eq("store_id", store.id);

      const { data: orders } = await supabase
        .from("orders").select("*").eq("store_id", store.id)
        .order("created_at", { ascending: false });

      const totalOrder = orders?.length || 0;
      const ordersPaid = orders?.filter((o) => o.status !== "pending") || [];
      const totalPendapatan = ordersPaid.reduce((sum, o) => sum + Number(o.total_price), 0);

      const jualPerProduk = {};
      orders?.forEach((o) => {
        jualPerProduk[o.product_name] = (jualPerProduk[o.product_name] || 0) + o.quantity;
      });
      const produkTerlaris = Object.entries(jualPerProduk)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      // Tren pendapatan 8 minggu terakhir (cuma order yang udah dibayar)
      const minggu = [];
      for (let i = 7; i >= 0; i--) {
        const mulai = new Date();
        mulai.setDate(mulai.getDate() - mulai.getDay() - i * 7);
        mulai.setHours(0, 0, 0, 0);
        const akhir = new Date(mulai);
        akhir.setDate(akhir.getDate() + 7);
        const total = ordersPaid
          .filter((o) => {
            const t = new Date(o.paid_at || o.created_at);
            return t >= mulai && t < akhir;
          })
          .reduce((sum, o) => sum + Number(o.total_price), 0);
        minggu.push({ label: mulai.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), total });
      }
      setTrenMingguan(minggu);

      // Stok menipis (<= 5)
      const menipis = (products || [])
        .filter((p) => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);
      setStokMenipis(menipis);

      // Pesanan terbaru (5)
      setPesananTerbaru((orders || []).slice(0, 5));

      setStats({ totalOrder, totalPendapatan, totalProduk: products?.length || 0, produkTerlaris });
      setLoadingStats(false);
    }
    fetchStats();
  }, [store.id]);

  const statusBadge = {
    pending: { label: "Menunggu bayar", className: "bg-[#F1EFE8] text-[#5B6472]" },
    paid: { label: "Dibayar", className: "bg-[#EAF3DE] text-[#3B6D11]" },
  };


  const statusBadge = {
    pending: { label: "Menunggu bayar", className: "bg-[#F1EFE8] text-[#5B6472]" },
    paid: { label: "Dibayar", className: "bg-[#EAF3DE] text-[#3B6D11]" },
  };

  return (
    <DashboardLayout store={store} activeMenu="/dashboard">
      <div className="max-w-5xl">
        <PushOptIn />
        <OnboardingGuide store={store} />

          <PushOptIn />
          <OnboardingGuide store={store} />

          {/* STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
              <div className="flex items-center gap-2 text-[#8B8D85] text-xs mb-2">
                <Wallet size={14} /> Total pendapatan
              </div>
              <p className="text-2xl font-bold text-[#1C1C1A]">
                Rp{loadingStats ? "..." : stats.totalPendapatan.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
              <div className="flex items-center gap-2 text-[#8B8D85] text-xs mb-2">
                <ShoppingBag size={14} /> Total pesanan
              </div>
              <p className="text-2xl font-bold text-[#1C1C1A]">{loadingStats ? "..." : stats.totalOrder}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
              <div className="flex items-center gap-2 text-[#8B8D85] text-xs mb-2">
                <Package size={14} /> Total produk
              </div>
              <p className="text-2xl font-bold text-[#1C1C1A]">{loadingStats ? "..." : stats.totalProduk}</p>
            </div>
          </div>

          {/* PERFORMA TOKO (hari ini vs kemarin) */}
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1C1C1A]">Performa toko</h2>
              <span className="text-xs text-[#8B8D85]">Dibanding kemarin</span>
            </div>
            {!performa ? (
              <p className="text-sm text-[#8B8D85]">Memuat...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <PerformaItem label="Penjualan" value={`Rp${performa.penjualan.toLocaleString("id-ID")}`} delta={performa.penjualanDelta} />
                <PerformaItem label="Total pengunjung" value={performa.pengunjung} delta={performa.pengunjungDelta} />
                <PerformaItem label="Produk diklik" value={performa.klik} delta={performa.klikDelta} />
                <PerformaItem label="Pesanan" value={performa.pesanan} delta={performa.pesananDelta} />
                <PerformaItem label="Tingkat konversi" value={`${performa.konversi.toFixed(1)}%`} delta={performa.konversiDelta} />
              </div>
            )}
          </div>

          {/* TREN PENDAPATAN */}
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-[#D85A30]" />
              <h2 className="font-bold text-[#1C1C1A]">Tren pendapatan (8 minggu terakhir)</h2>
            </div>
            {loadingStats ? (
              <p className="text-sm text-[#8B8D85]">Memuat...</p>
            ) : trenMingguan.every((m) => m.total === 0) ? (
              <p className="text-sm text-[#8B8D85] text-center py-6">
                Belum ada pendapatan. Grafik bakal mulai keisi setelah ada pesanan dibayar.
              </p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {trenMingguan.map((m) => {
                  const max = Math.max(...trenMingguan.map((x) => x.total), 1);
                  const heightPct = Math.max((m.total / max) * 100, m.total > 0 ? 6 : 2);
                  return (
                    <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-[#1C1C1A] whitespace-nowrap bg-white border border-[#E5E2D9] px-1.5 py-0.5 rounded">
                        Rp{m.total.toLocaleString("id-ID")}
                      </div>
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{ height: `${heightPct}%`, background: m.total > 0 ? "#D85A30" : "#F1EFE8" }}
                      />
                      <span className="text-[10px] text-[#8B8D85] mt-1.5">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* STOK MENIPIS */}
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package size={18} className="text-[#D85A30]" />
                <h2 className="font-bold text-[#1C1C1A]">Stok menipis</h2>
              </div>
              {loadingStats ? (
                <p className="text-sm text-[#8B8D85]">Memuat...</p>
              ) : stokMenipis.length === 0 ? (
                <p className="text-sm text-[#8B8D85] text-center py-6">Stok semua produk masih aman.</p>
              ) : (
                <div className="space-y-2">
                  {stokMenipis.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#F1EFE8] last:border-0">
                      <span className="text-sm text-[#1C1C1A] line-clamp-1">{p.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stock === 0 ? "bg-[#FBEAEA] text-[#A32D2D]" : "bg-[#FAEEDA] text-[#854F0B]"}`}>
                        {p.stock === 0 ? "Habis" : `Sisa ${p.stock}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PESANAN TERBARU */}
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag size={18} className="text-[#D85A30]" />
                <h2 className="font-bold text-[#1C1C1A]">Pesanan terbaru</h2>
              </div>
              {loadingStats ? (
                <p className="text-sm text-[#8B8D85]">Memuat...</p>
              ) : pesananTerbaru.length === 0 ? (
                <p className="text-sm text-[#8B8D85] text-center py-6">Belum ada pesanan masuk.</p>
              ) : (
                <div className="space-y-2">
                  {pesananTerbaru.map((o) => (
                    <a key={o.id} href="/dashboard/pesanan"
                      className="flex items-center justify-between py-2 border-b border-[#F1EFE8] last:border-0 hover:bg-[#FAFAF7] -mx-2 px-2 rounded">
                      <div className="min-w-0">
                        <p className="text-sm text-[#1C1C1A] line-clamp-1">{o.buyer_name}</p>
                        <p className="text-xs text-[#8B8D85] line-clamp-1">{o.product_name}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${(statusBadge[o.status] || statusBadge.pending).className}`}>
                        {(statusBadge[o.status] || statusBadge.pending).label}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PRODUK TERLARIS */}
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-[#D85A30]" />
              <h2 className="font-bold text-[#1C1C1A]">Produk terlaris</h2>
            </div>
            {loadingStats ? (
              <p className="text-sm text-[#8B8D85]">Memuat...</p>
            ) : stats.produkTerlaris.length === 0 ? (
              <p className="text-sm text-[#8B8D85] text-center py-6">
                Belum ada penjualan. Data bakal muncul di sini setelah ada pesanan masuk.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.produkTerlaris.map(([name, qty], i) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-[#F1EFE8] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#FAECE7] text-[#D85A30] text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm text-[#1C1C1A]">{name}</span>
                    </div>
                    <span className="text-sm text-[#8B8D85]">{qty} terjual</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </DashboardLayout>
  );
}