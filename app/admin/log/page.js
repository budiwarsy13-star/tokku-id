"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Panel, Tabel, Halaman, Lencana, Memuat, Galat, Tombol, angka, tanggal } from "@/components/admin/ui";
import { useData, adminFetch } from "@/lib/admin-client";

export default function LogAudit() {
  const [hal, setHal] = useState(1);
  const [cek, setCek] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const { memuat, data, galat } = useData(`/api/admin/audit?hal=${hal}`);

  async function verifikasi() {
    setSibuk(true); setCek(null);
    const r = await adminFetch("/api/admin/audit/verifikasi");
    setSibuk(false); setCek(r.ok ? r.data : { gagal: r.data?.message || "Gagal memeriksa." });
  }
  return (
    <AdminShell aktif="/admin/log" judul="Log audit">
      <Galat teks={galat} />
      <Panel judul="Rekam jejak aktivitas admin" aksi={<Tombol kecil onClick={verifikasi} disabled={sibuk}>{sibuk ? "Memeriksa..." : "Periksa keutuhan rantai"}</Tombol>}>
        {cek && (
          <div className={`rounded-xl px-4 py-3 text-sm mb-4 ${cek.gagal ? "bg-[#FCEBEB] text-[#A32D2D]" : cek.utuh ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FCEBEB] text-[#A32D2D]"}`}>
            {cek.gagal ? cek.gagal : cek.utuh ? `Rantai utuh: ${angka(cek.total)} catatan, tidak ada yang diubah atau dihapus.` : `PERINGATAN: rantai putus di catatan #${cek.rusakDiSeq}. Ada catatan yang diubah/dihapus/disisipkan. Segera selidiki.`}
          </div>
        )}
        {memuat && !data ? <Memuat /> : data && (
          <>
            <Tabel kosong="Belum ada catatan." baris={data.log.map((l) => ({ ...l, __key: l.seq }))} kolom={[
              { judul: "#", isi: (l) => l.seq },
              { judul: "Waktu", isi: (l) => tanggal(l.created_at) },
              { judul: "Admin", isi: (l) => <div>{l.admin_email || "-"}<p className="text-[11px] text-[#8B8D85]">{l.role || ""} · {l.ip || ""}</p></div> },
              { judul: "Aksi", isi: (l) => <Lencana teks={l.action} tipe={l.action.startsWith("akses_ditolak") ? "bad" : l.action.startsWith("pii.") ? "warn" : "info"} /> },
              { judul: "Target", isi: (l) => <span className="font-mono text-[11px]">{l.target_type ? `${l.target_type}:${l.target_id}` : "-"}</span> },
              { judul: "Alasan / detail", isi: (l) => (
                <div className="max-w-sm">
                  {l.reason && <p className="text-xs">{l.reason}</p>}
                  {l.detail && <details><summary className="text-[11px] text-[#8B8D85] cursor-pointer">detail</summary><pre className="text-[10px] whitespace-pre-wrap break-all bg-[#FAFAF7] p-2 rounded mt-1">{JSON.stringify(l.detail, null, 1)}</pre></details>}
                </div>) },
            ]} />
            <Halaman hal={data.hal} perHal={data.perHal} total={data.total} onGanti={setHal} />
          </>
        )}
      </Panel>
    </AdminShell>
  );
}
