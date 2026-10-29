"use client";

import { useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import LineChartSVG from "@/components/LineChartSVG";
import { Kartu, Panel, Memuat, Galat, angka, rupiah } from "@/components/admin/ui";
import { useData } from "@/lib/admin-client";

const RENTANG = [["7", "7 hari"], ["30", "30 hari"], ["90", "90 hari"]];
const tglPendek = (s) => new Date(s + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });

export default function DashboardAdmin() {
  const [hari, setHari] = useState("30");
  const { memuat, data, galat } = useData(`/api/admin/ringkasan?hari=${hari}`);
  const r = data?.ringkasan;
  const buyerBelum = r ? Math.max(r.total_buyer - r.buyer_pernah_beli, 0) : 0;
  const konversi = r && r.total_buyer ? Math.round((r.buyer_pernah_beli / r.total_buyer) * 100) : 0;

  return (
    <AdminShell aktif="/admin" judul="Dashboard">
      <Galat teks={galat} />
      {memuat && !data ? <Memuat /> : data && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8B8D85] mb-2">Seller</p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Kartu judul="Total seller" nilai={angka(r.total_seller)} />
              <Kartu judul="Seller aktif (30 hari)" nilai={angka(r.seller_aktif_30d)} catatan="ada transaksi dibayar" />
              <Kartu judul="Seller berlangganan aktif" nilai={angka(r.seller_pro_aktif)} catatan="paket Pro / berbayar yang masih berlaku" />
              <Kartu judul="Seller baru (7 hari)" nilai={angka(r.seller_baru_7d)} />
              <Kartu judul="Toko ditangguhkan" nilai={angka(r.seller_ditangguhkan)} tipe={r.seller_ditangguhkan ? "bad" : undefined} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8B8D85] mb-2">Buyer (nomor HP unik yang pernah masuk data)</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kartu judul="Total buyer" nilai={angka(r.total_buyer)} catatan="semua yang pernah checkout" />
              <Kartu judul="Pernah beli" nilai={angka(r.buyer_pernah_beli)} catatan="minimal 1 pesanan dibayar" />
              <Kartu judul="Belum / tidak jadi beli" nilai={angka(buyerBelum)} catatan="hanya pending atau gagal" />
              <Kartu judul="Konversi buyer" nilai={`${konversi}%`} catatan="pernah beli ÷ total buyer" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8B8D85] mb-2">Penjualan & pendapatan</p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Kartu judul="GMV 30 hari" nilai={rupiah(r.gmv_30d)} catatan="online dibayar + COD lunas, termasuk ongkir" />
              <Kartu judul="GMV total" nilai={rupiah(r.gmv_total)} />
              <Kartu judul="Transaksi 30 hari" nilai={angka(r.transaksi_30d)} />
              <Kartu judul="Transaksi total" nilai={angka(r.transaksi_total)} />
              <Kartu judul="Pendapatan langganan 30 hari" nilai={rupiah(data.langganan.dibayar_30d)} catatan={`total ${rupiah(data.langganan.dibayar_total)}`} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#5B6472]">Rentang grafik:</span>
            {RENTANG.map(([v, l]) => (
              <button key={v} onClick={() => setHari(v)} className={`text-xs px-3 py-1 rounded-full border ${hari === v ? "bg-[#1C1C1A] border-[#1C1C1A] text-white" : "border-[#E5E2D9] text-[#5B6472] hover:bg-white"}`}>{l}</button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel judul="Traffic kunjungan toko" aksi={<span className="text-xs text-[#8B8D85]">{angka(data.traffic.reduce((s, x) => s + Number(x.kunjungan), 0))} kunjungan</span>}>
              <LineChartSVG data={data.traffic.map((x) => ({ label: tglPendek(x.hari), value: Number(x.kunjungan) }))} formatValue={angka} />
              <p className="text-[11px] text-[#8B8D85] mt-2">Jumlah halaman toko dibuka (semua toko), zona waktu WIB.</p>
            </Panel>
            <Panel judul="Penjualan harian (GMV)" aksi={<span className="text-xs text-[#8B8D85]">{angka(data.penjualan.reduce((s, x) => s + Number(x.transaksi), 0))} transaksi</span>}>
              <LineChartSVG color="#3B6D11" data={data.penjualan.map((x) => ({ label: tglPendek(x.hari), value: Number(x.gmv) }))} formatValue={rupiah} />
              <p className="text-[11px] text-[#8B8D85] mt-2">Berdasarkan tanggal pembayaran diterima.</p>
            </Panel>
          </div>

          <Panel judul="Perlu perhatian">
            <ul className="divide-y divide-[#F1EFE8] text-sm">
              <li className="flex justify-between py-2.5"><span>Komplain belum diputus</span><Link className="font-semibold text-[#D85A30]" href="/admin/komplain">{angka(data.kasus.komplain)} →</Link></li>
              <li className="flex justify-between py-2.5"><span>Retur belum diputus</span><Link className="font-semibold text-[#D85A30]" href="/admin/komplain?jenis=retur">{angka(data.kasus.retur)} →</Link></li>
              <li className="flex justify-between py-2.5"><span>Komplain yang meminta Customer Service</span><span className={`font-semibold ${data.kasus.mintaCs ? "text-[#A32D2D]" : ""}`}>{angka(data.kasus.mintaCs)}</span></li>
              <li className="flex justify-between py-2.5"><span>Pembayaran langganan menunggu</span><Link className="font-semibold text-[#D85A30]" href="/admin/langganan">{angka(data.langganan.menunggu)} →</Link></li>
            </ul>
            {data.kasus.terpotong && <p className="text-[11px] text-[#8B8D85] mt-2">Angka kasus dihitung dari 1.000 data terbaru per jenis.</p>}
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}
