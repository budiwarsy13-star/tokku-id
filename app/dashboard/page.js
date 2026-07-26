"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { LayoutDashboard, Package, ShoppingBag, Store, LogOut, Wallet, TrendingUp } from "lucide-react";

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

  useEffect(() => {
    async function fetchStats() {
      const { count: totalProduk } = await supabase
        .from("products").select("*", { count: "exact", head: true }).eq("store_id", store.id);

      const { data: orders } = await supabase
        .from("orders").select("*").eq("store_id", store.id);

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

      setStats({ totalOrder, totalPendapatan, totalProduk: totalProduk || 0, produkTerlaris });
      setLoadingStats(false);
    }
    fetchStats();
  }, [store.id]);

  const menuItems = [
    { icon: LayoutDashboard, label: "Ringkasan", href: "/dashboard", active: true },
    { icon: Package, label: "Produk", href: "/dashboard/produk" },
    { icon: ShoppingBag, label: "Pesanan", href: "/dashboard/pesanan" },
    { icon: Store, label: "Pengaturan toko", href: "/dashboard/toko" },
  ];

  return (
    <main className="min-h-screen bg-[#FAFAF7] font-[family-name:var(--font-baloo)] flex">
      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-[#E5E2D9] flex flex-col fixed h-screen">
        <div className="px-6 py-5 border-b border-[#E5E2D9]">
          <span className="font-bold text-xl tracking-tight text-[#1C1C1A]">
            tok<span className="text-[#D85A30]">k</span>u<span className="text-[#8B8D85] font-normal">.id</span>
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <a key={item.label} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active ? "bg-[#FAECE7] text-[#D85A30] font-medium" : "text-[#5B6472] hover:bg-[#F1EFE8]"
              }`}>
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-[#E5E2D9]">
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#5B6472] hover:bg-[#F1EFE8] w-full transition-colors"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 ml-60">
        <header className="bg-white border-b border-[#E5E2D9] px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8B8D85]">Toko kamu</p>
            <h1 className="font-bold text-[#1C1C1A]">{store.name}</h1>
          </div>
          <a href={`https://tokku.id/${store.slug}`} target="_blank"
            className="text-sm text-[#D85A30] bg-[#FAECE7] px-3 py-1.5 rounded-lg">
            tokku.id/{store.slug}
          </a>
        </header>

        <div className="p-8 max-w-5xl">
          {/* STAT CARDS */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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
      </div>
    </main>
  );
}