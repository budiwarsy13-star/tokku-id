"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import LineChartSVG from "@/components/LineChartSVG";

const PERIODE = [
  { key: "7hari", label: "7 hari terakhir", hari: 7 },
  { key: "30hari", label: "30 hari terakhir", hari: 30 },
  { key: "90hari", label: "90 hari terakhir", hari: 90 },
];

function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

export default function LaporanPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("30hari");
  const [ringkasan, setRingkasan] = useState(null);
  const [dataChart, setDataChart] = useState([]);
  const [topProduk, setTopProduk] = useState([]);
  const [memuatData, setMemuatData] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      setLoading(false);
    }
    init();
  }, []);

  const muatLaporan = useCallback(async (storeId, periodeKey) => {
    setMemuatData(true);
    const jumlahHari = PERIODE.find((p) => p.key === periodeKey)?.hari || 30;
    const mulai = new Date();
    mulai.setDate(mulai.getDate() - (jumlahHari - 1));
    mulai.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from("orders")
      .select("status, total_price, product_name, quantity, created_at")
      .eq("store_id", storeId)
      .gte("created_at", mulai.toISOString());

    const berhasil = (orders || []).filter((o) => o.status === "paid" || o.status === "selesai");

    // Ringkasan atas
    setRingkasan({
      totalPenjualan: berhasil.reduce((s, o) => s + Number(o.total_price || 0), 0),
      totalOrder: berhasil.length,
      produkTerjual: berhasil.reduce((s, o) => s + (o.quantity || 0), 0),
    });

    // Data chart — dikelompokkan per hari sepanjang rentang periode (termasuk
    // hari yang gak ada order sama sekali, biar garisnya gak bolong/miring)
    const perHari = {};
    for (let i = 0; i < jumlahHari; i++) {
      const tgl = new Date(mulai);
      tgl.setDate(tgl.getDate() + i);
      const key = tgl.toISOString().slice(0, 10);
      perHari[key] = 0;
    }
    for (const o of berhasil) {
      const key = o.created_at.slice(0, 10);
      if (key in perHari) perHari[key] += Number(o.total_price || 0);
    }
    setDataChart(Object.entries(perHari).map(([tgl, total]) => ({
      label: new Date(tgl).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      value: total,
    })));

    // Top produk
    const perProduk = {};
    for (const o of berhasil) {
      if (!perProduk[o.product_name]) perProduk[o.product_name] = { qty: 0, omzet: 0 };
      perProduk[o.product_name].qty += o.quantity || 0;
      perProduk[o.product_name].omzet += Number(o.total_price || 0);
    }
    setTopProduk(
      Object.entries(perProduk)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10)
    );

    setMemuatData(false);
  }, []);

  useEffect(() => {
    if (store?.id) muatLaporan(store.id, periode);
  }, [store?.id, periode, muatLaporan]);

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/laporan" headerTitle="Laporan"
      headerRight={
        <select value={periode} onChange={(e) => setPeriode(e.target.value)}
          className="text-sm border border-[#E5E2D9] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#D85A30]">
          {PERIODE.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      }>
      <div className="max-w-4xl space-y-6">
        {/* Ringkasan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-4">
            <p className="text-xs text-[#8B8D85] mb-1">Total Penjualan</p>
            <p className="text-xl font-semibold text-[#1C1C1A]">{memuatData ? "—" : formatRupiah(ringkasan?.totalPenjualan)}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-4">
            <p className="text-xs text-[#8B8D85] mb-1">Total Order</p>
            <p className="text-xl font-semibold text-[#1C1C1A]">{memuatData ? "—" : (ringkasan?.totalOrder ?? 0)}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-4">
            <p className="text-xs text-[#8B8D85] mb-1">Produk Terjual</p>
            <p className="text-xl font-semibold text-[#1C1C1A]">{memuatData ? "—" : (ringkasan?.produkTerjual ?? 0)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
          <h3 className="font-semibold text-[#1C1C1A] mb-4">Tren penjualan</h3>
          {memuatData ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-[#8B8D85]">Memuat data...</div>
          ) : (
            <LineChartSVG data={dataChart} />
          )}
        </div>

        {/* Top produk */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
          <h3 className="font-semibold text-[#1C1C1A] mb-4">Produk terlaris</h3>
          {memuatData ? (
            <p className="text-sm text-[#8B8D85]">Memuat data...</p>
          ) : topProduk.length === 0 ? (
            <p className="text-sm text-[#8B8D85]">Belum ada penjualan di periode ini.</p>
          ) : (
            <div className="divide-y divide-[#F1EFE8]">
              {topProduk.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#F1EFE8] text-[#5B6472] flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                    <span className="text-[#1C1C1A] truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[#1C1C1A]">{p.qty} terjual</p>
                    <p className="text-xs text-[#8B8D85]">{formatRupiah(p.omzet)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
