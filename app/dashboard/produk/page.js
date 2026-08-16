"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationBell from "@/components/NotificationBell";

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

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <DashboardLayout
      store={store}
      activeMenu="/dashboard/produk"
      headerTitle="Produk"
      headerRight={
        <a href="/dashboard/tambah-produk"
          className="text-sm bg-[#D85A30] text-white px-4 py-2 rounded-lg hover:bg-[#B84A25] transition-colors whitespace-nowrap">
          + Tambah produk
        </a>
      }
    >
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 md:p-6">
        {products.length === 0 ? (
          <p className="text-sm text-[#8B8D85] text-center py-6">Belum ada produk. Yuk tambah produk pertama kamu.</p>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <a key={p.id} href={`/dashboard/produk/edit/${p.id}`}
                className="flex items-center gap-3 border border-[#E5E2D9] rounded-xl p-3 hover:border-[#D85A30] hover:shadow-sm transition-all">
                <div className="w-14 h-14 rounded-lg bg-[#F1EFE8] flex-shrink-0 overflow-hidden">
                  {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1C1C1A] truncate">{p.name}</p>
                  <p className="text-xs text-[#8B8D85]">Rp{Number(p.price).toLocaleString("id-ID")} · Stok {p.stock}</p>
                </div>
                <span className="text-xs text-[#D85A30] font-semibold flex-shrink-0">Edit →</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
