"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export const rupiah = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
export const angka = (n) => Number(n || 0).toLocaleString("id-ID");
export const tanggal = (iso) => iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
export const tanggalSaja = (iso) => iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

const WARNA = { ok: "bg-[#EAF3DE] text-[#3B6D11]", warn: "bg-[#FAEEDA] text-[#854F0B]", bad: "bg-[#FCEBEB] text-[#A32D2D]", info: "bg-[#E6F1FB] text-[#185FA5]", abu: "bg-[#F1EFE8] text-[#5B6472]", pro: "bg-[#1C1C1A] text-white" };
export function Lencana({ teks, tipe = "abu" }) {
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${WARNA[tipe] || WARNA.abu}`}>{teks}</span>;
}

export function Kartu({ judul, nilai, catatan, tipe }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E2D9] p-4">
      <p className="text-xs text-[#8B8D85] mb-1">{judul}</p>
      <p className={`text-2xl font-black ${tipe === "bad" ? "text-[#A32D2D]" : "text-[#1C1C1A]"}`}>{nilai}</p>
      {catatan && <p className="text-[11px] text-[#8B8D85] mt-1">{catatan}</p>}
    </div>
  );
}

export function Panel({ judul, aksi, children, className = "" }) {
  return (
    <section className={`bg-white rounded-xl border border-[#E5E2D9] ${className}`}>
      {(judul || aksi) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="font-bold text-[#1C1C1A]">{judul}</h2>
          {aksi}
        </div>
      )}
      <div className={judul || aksi ? "px-5 pb-5" : "p-5"}>{children}</div>
    </section>
  );
}

export function Memuat({ penuh = false }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-sm text-[#8B8D85] ${penuh ? "min-h-screen" : "py-10"}`}>
      <Loader2 size={16} className="animate-spin" /> Memuat...
    </div>
  );
}
export const Kosong = ({ teks = "Tidak ada data." }) => <p className="text-sm text-[#8B8D85] text-center py-8">{teks}</p>;
export const Galat = ({ teks }) => teks ? <div className="rounded-xl px-4 py-3 text-sm bg-[#FCEBEB] text-[#A32D2D] mb-4">{teks}</div> : null;

export function Tabel({ kolom, baris, kosong }) {
  if (!baris || baris.length === 0) return <Kosong teks={kosong} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[#8B8D85] border-b border-[#E5E2D9]">
          {kolom.map((k) => <th key={k.judul} className={`py-2 pr-4 font-semibold ${k.kanan ? "text-right" : ""}`}>{k.judul}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-[#F1EFE8]">
          {baris.map((b, i) => (
            <tr key={b.__key ?? i} className="align-top">
              {kolom.map((k) => <td key={k.judul} className={`py-2.5 pr-4 text-[#1C1C1A] ${k.kanan ? "text-right tabular-nums" : ""}`}>{k.isi(b)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Halaman({ hal, perHal, total, onGanti }) {
  const jumlah = Math.max(1, Math.ceil(total / perHal));
  if (jumlah <= 1) return null;
  const tombol = "px-3 py-1.5 rounded-lg border border-[#E5E2D9] text-sm disabled:opacity-40 hover:bg-[#FAFAF7]";
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-[#5B6472]">
      <span>Halaman {hal} dari {jumlah} · {angka(total)} data</span>
      <div className="flex gap-2">
        <button className={tombol} disabled={hal <= 1} onClick={() => onGanti(hal - 1)}>Sebelumnya</button>
        <button className={tombol} disabled={hal >= jumlah} onClick={() => onGanti(hal + 1)}>Berikutnya</button>
      </div>
    </div>
  );
}

export function Tombol({ children, onClick, tipe = "biasa", disabled, kecil }) {
  const gaya = { biasa: "bg-white border border-[#E5E2D9] text-[#1C1C1A] hover:bg-[#FAFAF7]", utama: "bg-[#D85A30] text-white hover:bg-[#B84A25]", bahaya: "bg-[#A32D2D] text-white hover:bg-[#7F2222]" }[tipe];
  return <button type="button" onClick={onClick} disabled={disabled} className={`rounded-lg font-medium disabled:opacity-40 transition-colors ${kecil ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"} ${gaya}`}>{children}</button>;
}

// Modal aksi umum: kumpulkan isian -> kirim -> tampilkan galat server apa adanya.
// field: [{ name, label, tipe: "text"|"number"|"textarea"|"select", opsi?: [[nilai,label]], placeholder?, bantuan? }]
export function ModalAksi({ judul, deskripsi, field = [], tombol = "Simpan", bahaya = false, onTutup, onKirim }) {
  const [nilai, setNilai] = useState(() => Object.fromEntries(field.map((f) => [f.name, f.awal ?? (f.tipe === "select" ? f.opsi?.[0]?.[0] : "")])));
  const [galat, setGalat] = useState("");
  const [proses, setProses] = useState(false);
  async function kirim() {
    setGalat(""); setProses(true);
    const r = await onKirim(nilai);
    setProses(false);
    if (r?.ok) onTutup(true); else setGalat(r?.pesan || "Gagal.");
  }
  const kelas = "w-full px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]";
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <h3 className="font-bold text-[#1C1C1A] mb-1">{judul}</h3>
        {deskripsi && <p className="text-sm text-[#5B6472] mb-4">{deskripsi}</p>}
        <div className="space-y-3">
          {field.map((f) => (
            <label key={f.name} className="block text-xs text-[#5B6472]">{f.label}
              {f.tipe === "textarea" ? (
                <textarea rows={3} maxLength={500} value={nilai[f.name]} placeholder={f.placeholder} onChange={(e) => setNilai({ ...nilai, [f.name]: e.target.value })} className={`mt-1 ${kelas}`} />
              ) : f.tipe === "select" ? (
                <select value={nilai[f.name]} onChange={(e) => setNilai({ ...nilai, [f.name]: e.target.value })} className={`mt-1 ${kelas}`}>
                  {f.opsi.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input type={f.tipe === "number" ? "number" : "text"} value={nilai[f.name]} placeholder={f.placeholder} onChange={(e) => setNilai({ ...nilai, [f.name]: e.target.value })} className={`mt-1 ${kelas}`} />
              )}
              {f.bantuan && <span className="block text-[11px] text-[#8B8D85] mt-1">{f.bantuan}</span>}
            </label>
          ))}
        </div>
        {galat && <p className="text-sm text-[#A32D2D] mt-3">{galat}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Tombol onClick={() => onTutup(false)} disabled={proses}>Batal</Tombol>
          <Tombol tipe={bahaya ? "bahaya" : "utama"} onClick={kirim} disabled={proses}>{proses ? "Memproses..." : tombol}</Tombol>
        </div>
      </div>
    </div>
  );
}

// Modal info sederhana (untuk menampilkan data pribadi yang dibuka: hilang begitu ditutup).
export function ModalInfo({ judul, children, onTutup }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md p-5">
        <h3 className="font-bold text-[#1C1C1A] mb-3">{judul}</h3>
        {children}
        <div className="flex justify-end mt-5"><Tombol onClick={onTutup}>Tutup</Tombol></div>
      </div>
    </div>
  );
}
