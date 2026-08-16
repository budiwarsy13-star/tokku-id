"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { buatNotifikasi } from "@/lib/notifications";
import { ShoppingBag, Tag, Clock, Truck, CheckCircle2, XCircle, Search } from "lucide-react";

const STATUS_LABEL = {
  pending: { label: "Menunggu", color: "bg-[#FFF4E0] text-[#B8860B]" },
  paid: { label: "Dibayar", color: "bg-[#EAF1E8] text-[#3B6D11]" },
  shipped: { label: "Dikirim", color: "bg-[#E8F0FA] text-[#2563EB]" },
  selesai: { label: "Selesai", color: "bg-[#F1EFE8] text-[#5B6472]" },
  gagal: { label: "Dibatalkan", color: "bg-[#FBEAEA] text-[#A32D2D]" },
};

// Definisi tab filter. `match` nentuin order mana yang masuk tab ini.
const TABS = [
  { key: "semua", label: "Semua", match: () => true },
  { key: "perlu_diproses", label: "Perlu diproses", match: (o) => o.status === "paid" },
  { key: "dikirim", label: "Sedang dikirim", match: (o) => o.status === "shipped" },
  { key: "selesai", label: "Selesai", match: (o) => o.status === "selesai" },
  { key: "dibatalkan", label: "Dibatalkan", match: (o) => o.status === "gagal" },
];

export default function PesananPage() {
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("semua");
  const [search, setSearch] = useState("");
  const [orderUntukResi, setOrderUntukResi] = useState(null); // order yang lagi diisi nomor resi

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

  async function updateStatus(rowId, newStatus, waybillNumber) {
    const order = orders.find((o) => o.id === rowId);
    if (!order) return;
    const groupKey = order.midtrans_order_id;

    const updateData = { status: newStatus };
    if (newStatus === "shipped") {
      updateData.shipped_at = new Date().toISOString();
      if (waybillNumber) updateData.waybill_number = waybillNumber;
    }
    if (newStatus === "selesai") updateData.completed_at = new Date().toISOString();

    // Update SEMUA baris yang share midtrans_order_id yang sama — soalnya kalau
    // pembeli checkout beberapa produk sekaligus dari cart, itu 1 paket fisik yang
    // dikirim bareng, jadi statusnya (dan nomor resi) harus konsisten semua baris.
    await supabase.from("orders").update(updateData).eq("midtrans_order_id", groupKey);
    setOrders(orders.map((o) => (o.midtrans_order_id === groupKey ? { ...o, ...updateData } : o)));

    const anggotaGrup = orders.filter((o) => o.midtrans_order_id === groupKey);
    const ringkasanProduk = anggotaGrup.length <= 1
      ? order.product_name
      : `${order.product_name} + ${anggotaGrup.length - 1} produk lainnya`;

    if (newStatus === "shipped") {
      await buatNotifikasi(supabase, {
        storeId: store.id,
        orderId: rowId,
        type: "delivery_update",
        title: "Status pengiriman diperbarui",
        message: `Pesanan ${ringkasanProduk} sudah ditandai dikirim.`,
      });
    } else if (newStatus === "selesai") {
      await buatNotifikasi(supabase, {
        storeId: store.id,
        orderId: rowId,
        type: "pesanan_selesai",
        title: "Pesanan selesai",
        message: `Pesanan ${ringkasanProduk} sudah ditandai selesai diterima pembeli.`,
      });
    }
  }

  // Hitung jumlah tiap kategori sekali aja, dipakai buat angka di stat card & badge tab
  const counts = useMemo(() => {
    const c = { perlu_diproses: 0, dikirim: 0, selesai: 0, dibatalkan: 0 };
    for (const o of orders) {
      if (o.status === "paid") c.perlu_diproses++;
      else if (o.status === "shipped") c.dikirim++;
      else if (o.status === "selesai") c.selesai++;
      else if (o.status === "gagal") c.dibatalkan++;
    }
    return c;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab) || TABS[0];
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (!tab.match(o)) return false;
      if (!q) return true;
      return (
        o.buyer_name?.toLowerCase().includes(q) ||
        o.product_name?.toLowerCase().includes(q) ||
        o.midtrans_order_id?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q)
      );
    });
  }, [orders, activeTab, search]);


  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  const statCards = [
    { key: "perlu_diproses", label: "Perlu diproses", value: counts.perlu_diproses, icon: Clock, color: "#B8860B" },
    { key: "dikirim", label: "Sedang dikirim", value: counts.dikirim, icon: Truck, color: "#2563EB" },
    { key: "selesai", label: "Selesai", value: counts.selesai, icon: CheckCircle2, color: "#3B6D11" },
    { key: "dibatalkan", label: "Dibatalkan", value: counts.dibatalkan, icon: XCircle, color: "#A32D2D" },
  ];

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/pesanan" headerTitle="Pesanan">
      <div>
        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statCards.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className="bg-white rounded-xl border border-[#E5E2D9] p-4 text-left hover:border-[#D85A30] transition-colors"
            >
              <div className="flex items-center gap-2 text-xs mb-2" style={{ color: s.color }}>
                <s.icon size={14} /> {s.label}
              </div>
              <p className="text-2xl font-bold text-[#1C1C1A]">{s.value}</p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
          {/* TABS + SEARCH */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[#E5E2D9] flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    activeTab === t.key ? "bg-[#1C1C1A] text-white" : "text-[#5B6472] hover:bg-[#F1EFE8]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8D85]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama pembeli / produk..."
                className="pl-8 pr-3 py-1.5 text-sm border border-[#E5E2D9] rounded-lg focus:outline-none focus:border-[#D85A30] w-56"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-sm text-[#8B8D85] text-center py-12">
              {orders.length === 0 ? "Belum ada pesanan masuk." : "Gak ada pesanan yang cocok dengan filter/pencarian ini."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F1EFE8] text-[#5B6472] text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Produk</th>
                  <th className="px-4 py-3 font-medium">Pembeli</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Batas kirim</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const batasKirim = hitungBatasKirim(o);
                  return (
                  <tr key={o.id} className="border-t border-[#F1EFE8]">
                    <td className="px-4 py-3 text-[#1C1C1A]">
                      {o.product_name}
                      <br />
                      <button
                        onClick={() => { navigator.clipboard.writeText(o.midtrans_order_id); }}
                        title="Klik buat copy Order ID"
                        className="text-xs text-[#8B8D85] font-mono hover:text-[#D85A30] hover:underline"
                      >
                        {o.midtrans_order_id}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#5B6472]">
                      {o.buyer_name}
                      <br />
                      <span className="text-xs text-[#8B8D85]">{o.buyer_phone}</span>
                      <br />
                      <span className="text-xs text-[#8B8D85]">
                        {o.full_address}, {o.destination_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5B6472]">{o.quantity}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1C1A]">
                      Rp{Number(o.total_price).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      {batasKirim && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${batasKirim.color}`}>
                          {batasKirim.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => {
                          if (e.target.value === "shipped") {
                            setOrderUntukResi(o);
                          } else {
                            updateStatus(o.id, e.target.value);
                          }
                        }}
                        disabled={o.status === "gagal"}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 disabled:opacity-70 ${STATUS_LABEL[o.status]?.color}`}
                      >
                        <option value="pending">Menunggu</option>
                        <option value="paid">Dibayar</option>
                        <option value="shipped">Dikirim</option>
                        <option value="selesai">Selesai</option>
                        {o.status === "gagal" && <option value="gagal">Dibatalkan</option>}
                      </select>
                      {o.waybill_number && (
                        <button
                          onClick={() => setOrderUntukResi(o)}
                          title="Klik buat ubah nomor resi"
                          className="block text-[11px] text-[#8B8D85] font-mono mt-1 hover:text-[#D85A30] hover:underline"
                        >
                          Resi: {o.waybill_number}
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>

      {orderUntukResi && (
        <ResiModal
          order={orderUntukResi}
          onClose={() => setOrderUntukResi(null)}
          onSubmit={(waybillNumber) => {
            updateStatus(orderUntukResi.id, "shipped", waybillNumber);
            setOrderUntukResi(null);
          }}
        />
      )}
      </div>
    </DashboardLayout>
  );
}

function ResiModal({ order, onClose, onSubmit }) {
  const [waybillNumber, setWaybillNumber] = useState(order.waybill_number || "");

  function handleSubmit(e) {
    e.preventDefault();
    if (!waybillNumber.trim()) return;
    onSubmit(waybillNumber.trim().toUpperCase());
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-6">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm">
        <div className="p-5 border-b border-[#E5E2D9]">
          <h2 className="font-bold text-[#1C1C1A]">
            {order.waybill_number ? "Ubah nomor resi" : "Masukin nomor resi"}
          </h2>
          <p className="text-xs text-[#8B8D85] mt-1">
            Pesanan {order.product_name} · {order.courier || "Kurir belum tercatat"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-[#FAECE7] text-[#712B13] text-xs px-3 py-2.5 rounded-lg">
            Ambil nomor resi dari struk/label yang dikasih kurir pas kamu drop-off atau pas paket dijemput.
          </div>
          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Nomor resi (AWB)</label>
            <input
              type="text"
              required
              autoFocus
              value={waybillNumber}
              onChange={(e) => setWaybillNumber(e.target.value.toUpperCase())}
              placeholder="Contoh: JP1234567890"
              className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm font-mono focus:outline-none focus:border-[#D85A30]"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[#E5E2D9] text-[#5B6472] hover:bg-[#FAFAF7]">
              Batal
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#D85A30] text-white hover:bg-[#B84A25]">
              {order.waybill_number ? "Simpan" : "Tandai dikirim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Pesanan yang udah dibayar tapi belum dikirim punya batas waktu 1 hari (24 jam)
// sejak pembayaran masuk. Fungsi ini nentuin label & warnanya di tabel.
function hitungBatasKirim(order) {
  if (order.status !== "paid" || !order.paid_at) return null;
  const deadline = new Date(order.paid_at).getTime() + 24 * 60 * 60 * 1000;
  const sisaMs = deadline - Date.now();
  if (sisaMs <= 0) {
    return { label: "Lewat batas!", color: "bg-[#FBEAEA] text-[#A32D2D]" };
  }
  const sisaJam = Math.ceil(sisaMs / (60 * 60 * 1000));
  return {
    label: `${sisaJam} jam lagi`,
    color: sisaJam <= 6 ? "bg-[#FFF4E0] text-[#B8860B]" : "bg-[#EAF1E8] text-[#3B6D11]",
  };
}