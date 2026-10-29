"use client";

import { useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { Kartu, Panel, Tabel, Memuat, Galat, Tombol, ModalAksi, rupiah } from "@/components/admin/ui";
import { useData, adminFetch, useAdminMe } from "@/lib/admin-client";
import { punya } from "@/lib/admin-permissions";

export default function KeuanganAdmin() {
  const me = useAdminMe();
  const { memuat, data, galat, muatUlang } = useData("/api/admin/keuangan");
  const [modal, setModal] = useState(null);
  const t = data?.total;

  return (
    <AdminShell aktif="/admin/keuangan" judul="Keuangan seller" me={me}>
      <Galat teks={galat} />
      {memuat && !data ? <Memuat /> : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Kartu judul="Ditahan (dibayar/dikirim)" nilai={rupiah(t.ditahan)} catatan="menunggu barang diterima" />
            <Kartu judul="Dapat dicairkan" nilai={rupiah(t.dapat_dicairkan)} catatan="pesanan selesai, tanpa sengketa" />
            <Kartu judul="Sengketa" nilai={rupiah(t.sengketa)} catatan="ada komplain/retur terbuka" tipe={t.sengketa ? "bad" : undefined} />
            <Kartu judul="Sudah dicairkan" nilai={rupiah(t.sudah_dicairkan)} />
            <Kartu judul="Saldo wajib dibayar" nilai={rupiah(t.saldo)} catatan="dapat dicairkan + koreksi − pencairan" />
          </div>
          <Panel judul="Saldo per seller" aksi={<span className="text-xs text-[#8B8D85]">urut saldo terbesar</span>}>
            <Tabel kosong="Belum ada transaksi." baris={data.seller.map((s) => ({ ...s, __key: s.store_id }))} kolom={[
              { judul: "Toko", isi: (s) => <Link href={`/admin/seller/${s.store_id}`} className="font-semibold text-[#D85A30] hover:underline">{s.store_name}</Link> },
              { judul: "Ditahan", kanan: true, isi: (s) => rupiah(s.ditahan) },
              { judul: "Dapat dicairkan", kanan: true, isi: (s) => rupiah(s.dapat_dicairkan) },
              { judul: "Sengketa", kanan: true, isi: (s) => s.sengketa ? <span className="text-[#A32D2D]">{rupiah(s.sengketa)}</span> : "-" },
              { judul: "Dicairkan", kanan: true, isi: (s) => rupiah(s.sudah_dicairkan) },
              { judul: "Koreksi", kanan: true, isi: (s) => s.koreksi ? rupiah(s.koreksi) : "-" },
              { judul: "Saldo", kanan: true, isi: (s) => <b>{rupiah(s.saldo)}</b> },
              { judul: "", isi: (s) => me && punya(me.role, "keuangan.tulis") && s.saldo > 0 ? <Tombol kecil tipe="utama" onClick={() => setModal(s)}>Catat pencairan</Tombol> : null },
            ]} />
          </Panel>
          <p className="text-[11px] text-[#8B8D85]">Angka HANYA dari pesanan ONLINE (Midtrans) berstatus dibayar/dikirim/selesai, termasuk ongkir yang dibayar pembeli. Pesanan COD tidak ikut: uangnya ditagih kurir, tidak pernah dipegang platform. Halaman ini mencatat pencairan; transfer uangnya tetap dilakukan manual lalu nomor referensinya dicatat di sini. Catatan keuangan tidak bisa diubah atau dihapus; kesalahan dikoreksi dengan entri “koreksi”.</p>
        </div>
      )}
      {modal && (
        <ModalAksi judul={`Catat pencairan: ${modal.store_name}`} deskripsi={`Saldo yang dapat dicairkan: ${rupiah(modal.saldo)}. Catat HANYA setelah transfer benar-benar dilakukan.`} tombol="Catat pencairan"
          field={[{ name: "jumlah", label: "Jumlah dicairkan (Rp)", tipe: "number", awal: String(modal.saldo) }, { name: "referensi", label: "Nomor referensi transfer (unik)", tipe: "text", placeholder: "mis. TRF-20261020-001" }, { name: "catatan", label: "Catatan (opsional)", tipe: "textarea" }]}
          onTutup={(sukses) => { setModal(null); if (sukses) muatUlang(); }}
          onKirim={async (v) => { const r = await adminFetch("/api/admin/keuangan/aksi", { method: "POST", body: { aksi: "pencairan", storeId: modal.store_id, jumlah: Number(v.jumlah), referensi: v.referensi, catatan: v.catatan } }); return r.ok ? { ok: true } : { ok: false, pesan: r.data?.message }; }} />
      )}
    </AdminShell>
  );
}
