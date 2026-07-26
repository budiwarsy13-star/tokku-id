"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { LayoutDashboard, Package, ShoppingBag, Store, LogOut } from "lucide-react";

const STATUS_LABEL = {
  pending: { label: "Menunggu", color: "bg-[#FFF4E0] text-[#B8860B]" },
  paid: { label: "Dibayar", color: "bg-[#EAF1E8] text-[#3B6D11]" },
  shipped: { label: "Dikirim", color: "bg-[#E8F0FA] text-[#2563EB]" },
  selesai: { label: "Selesai", color: "bg-[#F1EFE8] text-[#5B6472]" },
};

export default function PesananPage() {
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);

      const { data: ordersData } = await supabase
        .from("orders").select("*").eq("store_id", storeData.id).order("created_at", { ascending: false });
      setOrders(ordersData || []);
      setLoading(false);
    }
    init();
  }, []);

  async function updateStatus(orderId, newStatus) {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
  }

  const menuItems = [
    { icon: LayoutDashboard, label: "Ringkasan", href: "/dashboard" },
    { icon: Package, label: "Produk", href: "/dashboard/produk" },
    { icon: ShoppingBag, label: "Pesanan", href: "/dashboard/pesanan", active: true },
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                item.active ? "bg-[#FAECE7] text-[#D85A30] font-medium" : "text-[#5B6472] hover:bg-[#F1EFE8] hover:translate-x-0.5"
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
        <h1 className="text-xl font-bold text-[#1C1C1A] mb-6">Pesanan</h1>

        <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
          {orders.length === 0 ? (
            <p className="text-sm text-[#8B8D85] text-center py-12">Belum ada pesanan masuk.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F1EFE8] text-[#5B6472] text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Produk</th>
                  <th className="px-4 py-3 font-medium">Pembeli</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-[#F1EFE8]">
                    <td className="px-4 py-3 text-[#1C1C1A]">{o.product_name}</td>
                    <td className="px-4 py-3 text-[#5B6472]">
                      {o.buyer_name}
                      <br />
                      <span className="text-xs text-[#8B8D85]">{o.buyer_phone}</span>
                    </td>
                    <td className="px-4 py-3 text-[#5B6472]">{o.quantity}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1C1A]">
                      Rp{Number(o.total_price).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${STATUS_LABEL[o.status]?.color}`}
                      >
                        <option value="pending">Menunggu</option>
                        <option value="paid">Dibayar</option>
                        <option value="shipped">Dikirim</option>
                        <option value="selesai">Selesai</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}