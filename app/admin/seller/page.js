"use client";

import { useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { Panel, Tabel, Halaman, Lencana, Memuat, Galat, Tombol, angka, rupiah, tanggalSaja } from "@/components/admin/ui";
import { useData } from "@/lib/admin-client";

export default function DaftarSeller() {
  const [q, setQ] = useState("");
  const [cari, setCari] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [hal, setHal] = useState(1);
  const { memuat, data, galat } = useData(`/api/admin/seller?q=${encodeURIComponent(cari)}&plan=${plan}&status=${status}&hal=${hal}`);
  const kelas = "px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm bg-white focus:outline-none focus:border-[#D85A30]";
  const ubah = (fn) => (e) => { fn(e.target.value); setHal(1); };

  return (
    <AdminShell aktif="/admin/seller" judul="Seller">
      <Galat teks={galat} />
      <Panel>
        <form className="flex flex-wrap gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); setCari(q); setHal(1); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau slug toko..." className={`${kelas} flex-1 min-w-[180px]`} />
          <select value={plan} onChange={ubah(setPlan)} className={kelas}><option value="">Semua paket</option><option value="pro">Berlangganan aktif</option><option value="free">Gratis</option></select>
          <select value={status} onChange={ubah(setStatus)} className={kelas}><option value="">Semua status</option><option value="active">Aktif</option><option value="suspended">Ditangguhkan</option></select>
          <Tombol tipe="utama" onClick={() => { setCari(q); setHal(1); }}>Cari</Tombol>
        </form>
        {memuat && !data ? <Memuat /> : data && (
          <>
            <Tabel kosong="Tidak ada seller yang cocok." baris={data.seller.map((s) => ({ ...s, __key: s.id }))} kolom={[
              { judul: "Toko", isi: (s) => <div><Link href={`/admin/seller/${s.id}`} className="font-semibold text-[#D85A30] hover:underline">{s.name}</Link><p className="text-[11px] text-[#8B8D85]">/{s.slug}</p></div> },
              { judul: "Paket", isi: (s) => s.paket_aktif ? <div><Lencana teks="BERLANGGANAN" tipe="pro" /><p className="text-[11px] text-[#8B8D85]">s/d {tanggalSaja(s.plan_expires_at)}{s.plan === "berbayar" ? " · nilai 'berbayar'" : ""}</p></div> : <Lencana teks="Gratis" /> },
              { judul: "Status", isi: (s) => <div className="flex gap-1 flex-wrap">{s.status === "suspended" ? <Lencana teks="Ditangguhkan" tipe="bad" /> : <Lencana teks="Aktif" tipe="ok" />}{s.is_verified && <Lencana teks="Verified" tipe="info" />}</div> },
              { judul: "Produk", kanan: true, isi: (s) => angka(s.produk) },
              { judul: "Transaksi", kanan: true, isi: (s) => angka(s.transaksi) },
              { judul: "GMV", kanan: true, isi: (s) => rupiah(s.gmv) },
              { judul: "Transaksi terakhir", isi: (s) => tanggalSaja(s.transaksi_terakhir) },
              { judul: "Daftar", isi: (s) => tanggalSaja(s.created_at) },
            ]} />
            <Halaman hal={data.hal} perHal={data.perHal} total={data.total} onGanti={setHal} />
          </>
        )}
      </Panel>
    </AdminShell>
  );
}
