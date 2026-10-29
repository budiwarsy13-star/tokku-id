"use client";

import { useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import TombolPii from "@/components/admin/TombolPii";
import { Panel, Tabel, Halaman, Lencana, Memuat, Galat, Tombol, ModalAksi, tanggal } from "@/components/admin/ui";
import { useData, adminFetch, useAdminMe } from "@/lib/admin-client";
import { punya } from "@/lib/admin-permissions";

const ST = { baru: ["Baru", "warn"], diproses: ["Diproses", "info"], selesai: ["Selesai", "ok"], ditolak: ["Ditolak", "abu"] };
const awalJenis = () => { if (typeof window === "undefined") return ""; const j = new URLSearchParams(window.location.search).get("jenis"); return j === "retur" || j === "komplain" ? j : ""; };

export default function KomplainAdmin() {
  const me = useAdminMe();
  const [jenis, setJenis] = useState(awalJenis);
  const [status, setStatus] = useState("baru");
  const [hal, setHal] = useState(1);
  const [modal, setModal] = useState(null);
  const { memuat, data, galat, muatUlang } = useData(`/api/admin/komplain?jenis=${jenis}&status=${status}&hal=${hal}`);
  const kelas = "px-3 py-1.5 border border-[#E5E2D9] rounded-lg text-sm bg-white";

  return (
    <AdminShell aktif="/admin/komplain" judul="Komplain & Retur" me={me}>
      <Galat teks={galat} />
      <Panel aksi={null}>
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={jenis} onChange={(e) => { setJenis(e.target.value); setHal(1); }} className={kelas}><option value="">Komplain & retur</option><option value="komplain">Komplain saja</option><option value="retur">Retur saja</option></select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setHal(1); }} className={kelas}><option value="baru">Belum diputus (baru)</option><option value="diproses">Diproses</option><option value="selesai">Selesai</option><option value="ditolak">Ditolak</option><option value="semua">Semua status</option></select>
        </div>
        {memuat && !data ? <Memuat /> : data && (
          <>
            <Tabel kosong="Tidak ada kasus pada filter ini." baris={data.kasus.map((k) => ({ ...k, __key: `${k.jenis}:${k.id}` }))} kolom={[
              { judul: "Jenis", isi: (k) => <div className="space-y-1"><Lencana teks={k.jenis} tipe={k.jenis === "retur" ? "info" : "warn"} />{k.mintaCs && <div><Lencana teks="Minta CS" tipe="bad" /></div>}</div> },
              { judul: "Toko", isi: (k) => k.storeId ? <Link href={`/admin/seller/${k.storeId}`} className="text-[#D85A30] hover:underline">{k.toko}</Link> : "-" },
              { judul: "Pembeli", isi: (k) => <div><p>{k.nama || "-"}</p><p className="text-[11px] text-[#8B8D85]">{k.telepon}</p></div> },
              { judul: "Isi kasus", isi: (k) => <div className="max-w-xs"><p className="font-medium">{k.alasan || "-"}</p><p className="text-xs text-[#5B6472] whitespace-pre-wrap break-words">{k.deskripsi}</p>{k.catatan && <p className="text-[11px] text-[#8B8D85] mt-1">Catatan admin: {k.catatan}</p>}</div> },
              { judul: "Status", isi: (k) => <Lencana teks={ST[k.status]?.[0] || k.status} tipe={ST[k.status]?.[1]} /> },
              { judul: "Masuk", isi: (k) => tanggal(k.dibuat) },
              { judul: "", isi: (k) => (
                <div className="flex flex-col gap-1.5 items-start">
                  {me && punya(me.role, "komplain.tulis") && <Tombol kecil tipe="utama" onClick={() => setModal(k)}>Putuskan</Tombol>}
                  {me && punya(me.role, "pii.tampilkan") && k.jenis === "komplain" && <TombolPii jenis="komplain" id={k.id} />}
                </div>) },
            ]} />
            <Halaman hal={data.hal} perHal={data.perHal} total={data.total} onGanti={setHal} />
            {data.terpotong && <p className="text-[11px] text-[#8B8D85] mt-2">Menampilkan dari 300 kasus terbaru per jenis.</p>}
          </>
        )}
      </Panel>
      <p className="text-[11px] text-[#8B8D85] mt-3">Selama komplain/retur belum diputus (baru/diproses), dana pesanan itu otomatis masuk “sengketa” di halaman Keuangan dan tidak bisa dicairkan.</p>
      {modal && (
        <ModalAksi judul={`Putuskan ${modal.jenis}`} deskripsi={`${modal.alasan || ""}`} tombol="Simpan keputusan"
          field={[{ name: "status", label: "Keputusan", tipe: "select", opsi: [["diproses", "Sedang diproses"], ["selesai", "Selesai (dana seller bisa dicairkan)"], ["ditolak", "Ditolak"]], awal: "diproses" }, { name: "catatan", label: "Catatan keputusan (wajib untuk selesai/ditolak)", tipe: "textarea" }]}
          onTutup={(sukses) => { setModal(null); if (sukses) muatUlang(); }}
          onKirim={async (v) => { const r = await adminFetch("/api/admin/komplain/aksi", { method: "POST", body: { aksi: "putuskan", jenis: modal.jenis, id: modal.id, status: v.status, catatan: v.catatan } }); return r.ok ? { ok: true } : { ok: false, pesan: r.data?.message }; }} />
      )}
    </AdminShell>
  );
}
