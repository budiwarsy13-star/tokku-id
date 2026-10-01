"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Search, Crown } from "lucide-react";

function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

export default function DaftarPelanggan() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);

      const { data: orderData } = await supabase
        .from("orders")
        .select("buyer_name, buyer_phone, total_price, quantity, status, created_at, midtrans_order_id, product_name")
        .eq("store_id", storeData.id);
      setOrders(orderData || []);

      setLoading(false);
    }
    init();
  }, []);

  // Agregasi per nomor HP — ini "ID pelanggan" alami kita karena checkout
  // gak pake akun. 1 transaksi bisa punya beberapa baris produk yang share
  // midtrans_order_id yang sama, jadi "jumlah transaksi" dihitung dari ID
  // UNIK itu, bukan dari jumlah baris (biar gak digandain kalau beli 3
  // produk sekaligus dalam 1x checkout).
  const pelanggan = useMemo(() => {
    const perHp = {};
    for (const o of orders) {
      if (!o.buyer_phone) continue;
      if (!perHp[o.buyer_phone]) {
        perHp[o.buyer_phone] = {
          phone: o.buyer_phone,
          name: o.buyer_name,
          totalBelanja: 0,
          transaksiId: new Set(),
          produkQty: {},
          createdTerakhir: o.created_at,
        };
      }
      const p = perHp[o.buyer_phone];
      if (new Date(o.created_at) > new Date(p.createdTerakhir)) {
        p.createdTerakhir = o.created_at;
        p.name = o.buyer_name; // pakai nama dari order paling baru
      }
      if (o.status === "paid" || o.status === "selesai") {
        p.totalBelanja += Number(o.total_price || 0);
        p.transaksiId.add(o.midtrans_order_id);
        p.produkQty[o.product_name] = (p.produkQty[o.product_name] || 0) + (o.quantity || 0);
      }
    }

    return Object.values(perHp).map((p) => {
      const produkFavorit = Object.entries(p.produkQty).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
      return {
        phone: p.phone,
        name: p.name,
        totalBelanja: p.totalBelanja,
        jumlahTransaksi: p.transaksiId.size,
        produkFavorit,
        createdTerakhir: p.createdTerakhir,
      };
    }).sort((a, b) => b.totalBelanja - a.totalBelanja);
  }, [orders]);

  const hasilFilter = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pelanggan;
    return pelanggan.filter((p) => p.name?.toLowerCase().includes(q) || p.phone?.includes(q));
  }, [pelanggan, search]);

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/pelanggan" headerTitle="Daftar Pelanggan">
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8D85]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau nomor HP..."
              className="w-full pl-9 pr-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>
          <p className="text-sm text-[#8B8D85] shrink-0">{pelanggan.length} pelanggan</p>
        </div>

        {hasilFilter.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-8 text-center text-sm text-[#8B8D85]">
            {pelanggan.length === 0 ? "Belum ada pelanggan yang checkout." : "Gak ketemu, coba kata kunci lain."}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E5E2D9] divide-y divide-[#F1EFE8]">
            {hasilFilter.map((p, i) => (
              <a key={p.phone} href={`/dashboard/pesanan?search=${encodeURIComponent(p.phone)}`}
                className="flex items-center justify-between p-4 hover:bg-[#FAFAF7] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#F1EFE8] text-[#5B6472] flex items-center justify-center text-sm font-semibold shrink-0">
                    {i === 0 && p.totalBelanja > 0 ? <Crown size={16} className="text-[#B8860B]" /> : (p.name?.[0]?.toUpperCase() || "?")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1C1C1A] truncate">{p.name || "Tanpa nama"}</p>
                    <p className="text-xs text-[#8B8D85]">{p.phone} · {p.jumlahTransaksi} transaksi</p>
                    {p.produkFavorit !== "-" && (
                      <p className="text-xs text-[#8B8D85] truncate">Favorit: {p.produkFavorit}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold text-[#1C1C1A]">{formatRupiah(p.totalBelanja)}</p>
                  <p className="text-xs text-[#8B8D85]">
                    {new Date(p.createdTerakhir).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
