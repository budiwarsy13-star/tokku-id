"use client";

import { useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { Kartu, Panel, Tabel, Halaman, Lencana, Memuat, Galat, Tombol, angka, rupiah, tanggal } from "@/components/admin/ui";
import { useData, adminFetch, useAdminMe } from "@/lib/admin-client";
import { punya } from "@/lib/admin-permissions";

const STATUS = { paid: ["Lunas", "ok"], pending: ["Menunggu", "warn"], failed: ["Gagal", "bad"], expired: ["Kedaluwarsa", "abu"] };
const HASIL = { diaktifkan: "Pembayaran terverifikasi di Midtrans, paket DIAKTIFKAN.", sudah_lunas: "Sudah lunas.", expired: "Midtrans: kedaluwarsa. Tagihan ditandai kedaluwarsa.", failed: "Midtrans: dibatalkan/ditolak. Tagihan ditandai gagal.", masih_menunggu: "Midtrans: belum dibayar. Tidak ada perubahan." };

export default function LanggananAdmin() {
  const me = useAdminMe();
  const [status, setStatus] = useState("");
  const [hal, setHal] = useState(1);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState("");
  const { memuat, data, galat, muatUlang } = useData(`/api/admin/langganan?status=${status}&hal=${hal}`);

  async function sinkron(orderId) {
    setSibuk(orderId); setPesan("");
    const r = await adminFetch("/api/admin/langganan/aksi", { method: "POST", body: { aksi: "sinkron", orderId } });
    setSibuk(""); setPesan(r.ok ? HASIL[r.data.hasil] || "Selesai." : r.data?.message || "Gagal.");
    if (r.ok) muatUlang();
  }
  const rg = data?.ringkasan;
  return (
    <AdminShell aktif="/admin/langganan" judul="Langganan" me={me}>
      <Galat teks={galat} />
      {pesan && <div className="rounded-xl px-4 py-3 text-sm bg-[#E6F1FB] text-[#185FA5] mb-4">{pesan}</div>}
      {rg && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Kartu judul="Pendapatan 30 hari" nilai={rupiah(rg.dibayar_30d)} />
          <Kartu judul="Pendapatan total" nilai={rupiah(rg.dibayar_total)} />
          <Kartu judul="Pembayaran lunas 30 hari" nilai={angka(rg.transaksi_30d)} />
          <Kartu judul="Menunggu pembayaran" nilai={angka(rg.menunggu)} />
        </div>
      )}
      <Panel judul="Pembayaran langganan" aksi={
        <select value={status} onChange={(e) => { setStatus(e.target.value); setHal(1); }} className="px-3 py-1.5 border border-[#E5E2D9] rounded-lg text-sm bg-white">
          <option value="">Semua status</option><option value="paid">Lunas</option><option value="pending">Menunggu</option><option value="failed">Gagal</option><option value="expired">Kedaluwarsa</option>
        </select>}>
        {memuat && !data ? <Memuat /> : data && (
          <>
            <Tabel kosong="Belum ada pembayaran." baris={data.pembayaran.map((p) => ({ ...p, __key: p.order_id }))} kolom={[
              { judul: "Order", isi: (p) => <span className="font-mono text-xs">{p.order_id}</span> },
              { judul: "Toko", isi: (p) => p.stores ? <Link href={`/admin/seller/${p.store_id}`} className="text-[#D85A30] hover:underline">{p.stores.name}</Link> : "-" },
              { judul: "Periode", isi: (p) => `${p.period_months} bln` },
              { judul: "Jumlah", kanan: true, isi: (p) => p.amount ? rupiah(p.amount) : <span className="text-[#8B8D85]">Gratis (manual)</span> },
              { judul: "Sumber", isi: (p) => <Lencana teks={p.provider} /> },
              { judul: "Status", isi: (p) => <Lencana teks={STATUS[p.status]?.[0] || p.status} tipe={STATUS[p.status]?.[1]} /> },
              { judul: "Dibuat", isi: (p) => tanggal(p.created_at) },
              { judul: "", isi: (p) => p.status === "pending" && p.provider === "midtrans" && me && punya(me.role, "langganan.sinkron")
                ? <Tombol kecil disabled={sibuk === p.order_id} onClick={() => sinkron(p.order_id)}>{sibuk === p.order_id ? "Memeriksa..." : "Sinkron Midtrans"}</Tombol> : null },
            ]} />
            <Halaman hal={data.hal} perHal={data.perHal} total={data.total} onGanti={setHal} />
            <p className="text-[11px] text-[#8B8D85] mt-3">“Sinkron Midtrans” menanyakan status ke Midtrans langsung. Paket hanya aktif kalau Midtrans menyatakan lunas dengan nominal yang cocok. Tidak ada konfirmasi manual.</p>
          </>
        )}
      </Panel>
    </AdminShell>
  );
}
