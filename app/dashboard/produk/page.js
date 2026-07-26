"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { LayoutDashboard, Package, ShoppingBag, Store, LogOut } from "lucide-react";

export default function ProdukPage() {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);

      const { data: productsData } = await supabase
        .from("products").select("*").eq("store_id", storeData.id).order("created_at", { ascending: false });
      setProducts(productsData || []);
      setLoading(false);
    }
    init();
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: "Ringkasan", href: "/dashboard" },
    { icon: Package, label: "Produk", href: "/dashboard/produk", active: true },
    { icon: ShoppingBag, label: "Pesanan", href: "/dashboard/pesanan" },
    { icon: Store, label: "Pengaturan toko", href: "/dashboard/toko" },
  ];

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] font-[family-name:var(--font-baloo)] flex">
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
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#5B6472] hover:bg-[#F1EFE8] w-full transition-colors">
            <LogOut size={18} strokeWidth={1.75} /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-60 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#1C1C1A]">Produk</h1>
          <a href="/dashboard/tambah-produk"
            className="text-sm bg-[#D85A30] text-white px-4 py-2 rounded-lg hover:bg-[#B84A25] transition-colors">
            + Tambah produk
          </a>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
          {products.length === 0 ? (
            <p className="text-sm text-[#8B8D85] text-center py-6">Belum ada produk. Yuk tambah produk pertama kamu.</p>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border border-[#E5E2D9] rounded-lg p-3">
                  <div className="w-12 h-12 rounded-lg bg-[#F1EFE8] flex-shrink-0 overflow-hidden">
                    {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1C1C1A]">{p.name}</p>
                    <p className="text-xs text-[#8B8D85]">Rp{Number(p.price).toLocaleString("id-ID")} · Stok {p.stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}