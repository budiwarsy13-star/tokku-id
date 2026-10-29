"use client";
import { useState } from "react";
import { ModalAksi, ModalInfo, Tombol } from "@/components/admin/ui";
import { adminFetch } from "@/lib/admin-client";

// Membuka data pribadi asli (nama/HP/alamat/email) = wajib alasan, tercatat di log audit.
// Data hanya hidup di memori modal ini dan hilang begitu ditutup.
export default function TombolPii({ jenis, id, label = "Data pribadi" }) {
  const [langkah, setLangkah] = useState("tutup"); // tutup | alasan | hasil
  const [data, setData] = useState(null);
  return (
    <>
      <Tombol kecil onClick={() => setLangkah("alasan")}>{label}</Tombol>
      {langkah === "alasan" && (
        <ModalAksi judul="Buka data pribadi" deskripsi="Akses ini tercatat permanen di log audit beserta alasanmu."
          field={[{ name: "alasan", label: "Alasan membuka data pribadi", tipe: "textarea", placeholder: "Contoh: verifikasi komplain pembeli via telepon" }]}
          tombol="Buka data" onTutup={() => setLangkah((l) => (l === "hasil" ? "hasil" : "tutup"))}
          onKirim={async (v) => {
            const r = await adminFetch("/api/admin/pii", { method: "POST", body: { aksi: "tampilkan", jenis, id, alasan: v.alasan } });
            if (!r.ok) return { ok: false, pesan: r.data?.message };
            setData(r.data.data); setLangkah("hasil"); return { ok: true };
          }} />
      )}
      {langkah === "hasil" && data && (
        <ModalInfo judul="Data pribadi" onTutup={() => { setData(null); setLangkah("tutup"); }}>
          <dl className="text-sm space-y-2">
            {Object.entries(data).filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt className="text-[11px] uppercase tracking-wide text-[#8B8D85]">{k}</dt><dd className="text-[#1C1C1A] break-words">{String(v)}</dd></div>
            ))}
          </dl>
          <p className="text-[11px] text-[#8B8D85] mt-3">Jangan disalin ke chat/spreadsheet pribadi. Data ini hanya untuk menyelesaikan kasus.</p>
        </ModalInfo>
      )}
    </>
  );
}
