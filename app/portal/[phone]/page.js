// app/portal/[phone]/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Package, Clock, Truck, CheckCircle2, Star,
  RotateCcw, ShoppingBag, ArrowLeft, ChevronRight
} from "lucide-react";

const TABS = [
  { key: "perlu_dibayar",  label: "Perlu Dibayar",  icon: Clock,         statuses: ["pending"] },
  { key: "dikirim",        label: "Dikirim",         icon: Truck,         statuses: ["dikirim","perlu_diproses"] },
  { key: "akan_diterima",  label: "Akan Diterima",   icon: Package,       statuses: ["paid"] },
  { key: "untuk_diulas",   label: "Untuk Diulas",    icon: Star,          statuses: ["selesai"] },
  { key: "pengembalian",   label: "Pengembalian",    icon: RotateCcw,     statuses: ["return"] },
];

function rupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

function statusBadge(status) {
  const map = {
    pending:          { label: "Menunggu Bayar",   bg: "#FEF3C7", color: "#92400E" },
    paid:             { label: "Menunggu Kirim",   bg: "#DBEAFE", color: "#1E40AF" },
    perlu_diproses:   { label: "Dikemas",          bg: "#E0F2FE", color: "#0369A1" },
    dikirim:          { label: "Sedang Dikirim",   bg: "#DCFCE7", color: "#166534" },
    selesai:          { label: "Selesai",          bg: "#F0FFF4", color: "#166534" },
    dibatalkan:       { label: "Dibatalkan",       bg: "#FEE2E2", color: "#991B1B" },
  };
  const s = map[status] || { label: status, bg: "#F1EFE8", color: "#5B6472" };
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function PortalOrders() {
  const { phone } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("perlu_dibayar");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/portal/orders?phone=${phone}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setLoading(false);

      // Auto-pilih tab yang ada isinya
      if (data.orders?.length > 0) {
        const statusList = data.orders.map((o) => o.status);
        const firstTab = TABS.find((t) =>
          t.statuses.some((s) => statusList.includes(s)) ||
          (t.key === "untuk_diulas" && data.orders.some((o) => o.status === "selesai" && !o.review_submitted))
        );
        if (firstTab) setActiveTab(firstTab.key);
      }
    }
    load();
  }, [phone]);

  function filterOrders(tabKey) {
    const tab = TABS.find((t) => t.key === tabKey);
    if (!tab) return [];

    if (tabKey === "untuk_diulas") {
      return orders.filter((o) => o.status === "selesai" && !o.review_submitted);
    }
    if (tabKey === "pengembalian") {
      // Tampilkan order yang punya return request (join nanti, untuk sekarang filter selesai saja)
      return orders.filter((o) => o.status === "selesai");
    }
    return orders.filter((o) => tab.statuses.includes(o.status));
  }

  function tabCount(tabKey) {
    return filterOrders(tabKey).length;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <p className="text-[#8B8D85] text-sm">Memuat pesanan...</p>
      </main>
    );
  }

  const visibleOrders = filterOrders(activeTab);

  return (
    <main className="min-h-screen bg-[#FAFAF7]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E2D9] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => window.location.href = "/portal"}
          className="p-2 rounded-xl hover:bg-[#F1EFE8] text-[#5B6472]">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-bold text-[#1C1C1A]">Pesanan saya</h1>
          <p className="text-xs text-[#8B8D85]">+62{phone.replace(/^0/, "")}</p>
        </div>
        <a href="/" className="ml-auto font-bold text-lg tracking-tight text-[#1C1C1A]">
          tok<span className="text-[#D85A30]">k</span>u
          <span className="text-[#8B8D85] font-normal">.id</span>
        </a>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#E5E2D9] overflow-x-auto sticky top-[61px] z-10">
        <div className="flex px-4 min-w-max">
          {TABS.map((tab) => {
            const count = tabCount(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center px-4 py-3 text-xs font-medium relative whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "text-[#D85A30] border-b-2 border-[#D85A30]"
                    : "text-[#8B8D85]"
                }`}
              >
                <span className="flex items-center gap-1">
                  {tab.label}
                  {count > 0 && (
                    <span className="bg-[#D85A30] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {visibleOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E2D9] p-10 text-center">
            <ShoppingBag size={28} className="mx-auto mb-3 text-[#E5E2D9]" />
            <p className="text-sm text-[#8B8D85]">Belum ada pesanan di kategori ini.</p>
          </div>
        ) : (
          visibleOrders.map((order) => (
            <a
              key={order.id}
              href={`/portal/pesanan/${order.id}`}
              className="block bg-white rounded-2xl border border-[#E5E2D9] p-4 hover:border-[#D85A30] hover:shadow-sm transition-all"
            >
              {/* Store + status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {order.stores?.logo_url ? (
                    <img src={order.stores.logo_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#FAECE7] flex items-center justify-center">
                      <span className="text-[#D85A30] text-xs font-bold">{order.stores?.name?.[0]}</span>
                    </div>
                  )}
                  <span className="text-xs font-medium text-[#5B6472]">{order.stores?.name}</span>
                </div>
                {statusBadge(order.status)}
              </div>

              {/* Produk */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-xl bg-[#F1EFE8] overflow-hidden flex-shrink-0">
                  {order.products?.images?.[0] && (
                    <img src={order.products.images[0]} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1C1C1A] truncate">{order.product_name}</p>
                  <p className="text-xs text-[#8B8D85]">
                    {order.quantity}x · {rupiah(order.total_price)}
                  </p>
                  {order.courier && (
                    <p className="text-xs text-[#8B8D85] mt-0.5 flex items-center gap-1">
                      <Truck size={11} /> {order.courier}
                      {order.waybill_number && ` · ${order.waybill_number}`}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-[#D85A30] flex-shrink-0" />
              </div>

              {/* CTA per tab */}
              {activeTab === "perlu_dibayar" && (
                <div className="border-t border-[#F1EFE8] pt-3 flex gap-2">
                  <button className="flex-1 py-2 text-xs font-medium border border-[#E5E2D9] rounded-lg text-[#5B6472]">
                    Batalkan
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); window.location.href = `/portal/pesanan/${order.id}`; }}
                    className="flex-1 py-2 text-xs font-medium bg-[#D85A30] text-white rounded-lg"
                  >
                    Bayar Sekarang
                  </button>
                </div>
              )}

              {activeTab === "untuk_diulas" && !order.review_submitted && (
                <div className="border-t border-[#F1EFE8] pt-3">
                  <button
                    onClick={(e) => { e.preventDefault(); window.location.href = `/portal/pesanan/${order.id}#ulasan`; }}
                    className="w-full py-2 text-xs font-medium bg-[#F5B93F] text-[#1C1C1A] rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Star size={13} /> Beri Ulasan
                  </button>
                </div>
              )}
            </a>
          ))
        )}
      </div>
    </main>
  );
}
