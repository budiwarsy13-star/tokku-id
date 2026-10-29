"use client";

import { use, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import TombolPii from "@/components/admin/TombolPii";
import { Kartu, Panel, Tabel, Lencana, Memuat, Galat, Tombol, ModalAksi, angka, rupiah, tanggal, tanggalSaja } from "@/components/admin/ui";
import { useData, adminFetch, useAdminMe } from "@/lib/admin-client";
import { punya } from "@/lib/admin-permissions";

const ST_BAYAR = { paid: ["Lunas", "ok"], pending: ["Menunggu", "warn"], failed: ["Gagal", "bad"], expired: ["Kedaluwarsa", "abu"] };
const ST_PESANAN = { pending: "warn", paid: "info", shipped: "info", selesai: "ok", gagal: "bad", perlu_review: "warn", cod: "warn" };
const ST_KASUS = { baru: ["Baru", "warn"], diproses: ["Diproses", "info"], selesai: ["Selesai", "ok"], ditolak: ["Ditolak", "abu"] };
const ALASAN = { name: "alasan", label: "Alasan (wajib, tercatat di log audit)", tipe: "textarea", placeholder: "Jelaskan dasar keputusan ini" };

export default function DetailSeller({ params }) {
  const { id } = use(params);
  const me = useAdminMe();
  const { memuat, data, galat, muatUlang } = useData(`/api/admin/seller/${encodeURIComponent(id)}`);
  const [modal, setModal] = useState(null);
  const boleh = (izin) => !!me && punya(me.role, izin);
  const t = data?.toko, k = data?.keuangan;
  const pro = !!t?.paketAktif; // dihitung server dari KEDUA sistem paket (pro / berbayar)

  const aksiSeller = (aksi) => async (v) => {
    const r = await adminFetch(`/api/admin/seller/${encodeURIComponent(id)}/aksi`, { method: "POST", body: { aksi, alasan: v.alasan, hari: v.hari === undefined ? undefined : Number(v.hari) } });
    return r.ok ? { ok: true } : { ok: false, pesan: r.data?.message };
  };
  const KONFIG = {
    tangguhkan: { judul: "Tangguhkan toko", deskripsi: "Halaman toko tidak bisa dibuka & checkout ditolak. Seller mendapat notifikasi.", tombol: "Tangguhkan", bahaya: true, field: [ALASAN], kirim: aksiSeller("tangguhkan") },
    aktifkan: { judul: "Aktifkan kembali toko", tombol: "Aktifkan", field: [ALASAN], kirim: aksiSeller("aktifkan") },
    set_paket: { judul: "Beri / perpanjang paket Pro", deskripsi: "Ditambahkan ke sisa masa aktif. Tercatat di riwayat sebagai pemberian manual (nominal 0).", tombol: "Terapkan", field: [{ name: "hari", label: "Jumlah hari (1-3650)", tipe: "number", awal: "30" }, ALASAN], kirim: aksiSeller("set_paket") },
    cabut_paket: { judul: "Cabut paket Pro", deskripsi: "Toko kembali ke paket Gratis seketika.", tombol: "Cabut paket", bahaya: true, field: [ALASAN], kirim: aksiSeller("cabut_paket") },
    verifikasi: { judul: "Verifikasi manual (Verified Seller)", deskripsi: "Catatan: sistem dapat menghitung ulang badge ini otomatis saat ada pesanan dibayar berikutnya.", tombol: "Verifikasi", field: [ALASAN], kirim: aksiSeller("verifikasi") },
    cabut_verifikasi: { judul: "Cabut badge Verified", tombol: "Cabut badge", bahaya: true, field: [ALASAN], kirim: aksiSeller("cabut_verifikasi") },
    pencairan: { judul: "Catat pencairan dana", deskripsi: k ? `Saldo yang dapat dicairkan: ${rupiah(k.saldo)}. Catat HANYA setelah transfer benar-benar dilakukan.` : "", tombol: "Catat pencairan",
      field: [{ name: "jumlah", label: "Jumlah dicairkan (Rp)", tipe: "number", awal: k ? String(Math.max(k.saldo, 0)) : "" }, { name: "referensi", label: "Nomor referensi transfer (unik)", tipe: "text" }, { name: "catatan", label: "Catatan (opsional)", tipe: "textarea" }],
      kirim: async (v) => { const r = await adminFetch("/api/admin/keuangan/aksi", { method: "POST", body: { aksi: "pencairan", storeId: id, jumlah: Number(v.jumlah), referensi: v.referensi, catatan: v.catatan } }); return r.ok ? { ok: true } : { ok: false, pesan: r.data?.message }; } },
    koreksi: { judul: "Koreksi saldo seller", deskripsi: "Angka NEGATIF mengurangi saldo seller (mis. refund). Angka positif menambah. Tidak bisa dihapus setelah dicatat.", tombol: "Catat koreksi", bahaya: true,
      field: [{ name: "jumlah", label: "Jumlah koreksi (Rp, boleh negatif)", tipe: "number" }, { name: "catatan", label: "Alasan koreksi (wajib)", tipe: "textarea" }],
      kirim: async (v) => { const r = await adminFetch("/api/admin/keuangan/aksi", { method: "POST", body: { aksi: "koreksi", storeId: id, jumlah: Number(v.jumlah), catatan: v.catatan } }); return r.ok ? { ok: true } : { ok: false, pesan: r.data?.message }; } },
  };
  const kasusModal = (kasus) => ({
    judul: `Putuskan ${kasus.jenis}`, deskripsi: kasus.alasan, tombol: "Simpan keputusan",
    field: [{ name: "status", label: "Keputusan", tipe: "select", opsi: [["diproses", "Sedang diproses"], ["selesai", "Selesai (dana bisa dicairkan)"], ["ditolak", "Ditolak"]], awal: "diproses" }, { name: "catatan", label: "Catatan (wajib untuk selesai/ditolak)", tipe: "textarea" }],
    kirim: async (v) => { const r = await adminFetch("/api/admin/komplain/aksi", { method: "POST", body: { aksi: "putuskan", jenis: kasus.jenis, id: kasus.id, status: v.status, catatan: v.catatan } }); return r.ok ? { ok: true } : { ok: false, pesan: r.data?.message }; },
  });
  const cfg = modal ? (typeof modal === "string" ? KONFIG[modal] : kasusModal(modal)) : null;

  return (
    <AdminShell aktif="/admin/seller" judul={t ? t.name : "Seller"} me={me}>
      <Link href="/admin/seller" className="text-sm text-[#5B6472] hover:underline">← Semua seller</Link>
      <div className="mt-3" />
      <Galat teks={galat} />
      {memuat && !data ? <Memuat /> : data && (
        <div className="space-y-6">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {t.status === "suspended" ? <Lencana teks="Ditangguhkan" tipe="bad" /> : <Lencana teks="Aktif" tipe="ok" />}
                  {pro ? <Lencana teks={`BERLANGGANAN s/d ${tanggalSaja(t.paketSampai)}`} tipe="pro" /> : <Lencana teks="Gratis" />}
                  {t.plan === "berbayar" && <Lencana teks="nilai paket: berbayar (sistem lama)" tipe="warn" />}
                  {t.is_verified && <Lencana teks="Verified" tipe="info" />}
                </div>
                <p className="text-sm text-[#5B6472]">Toko: <a className="text-[#D85A30] hover:underline" target="_blank" rel="noopener noreferrer" href={`/${t.slug}`}>/{t.slug}</a> · Daftar {tanggalSaja(t.created_at)} · {angka(t.total_success_orders)} transaksi sukses</p>
                <p className="text-sm text-[#5B6472] mt-1 flex flex-wrap items-center gap-2">Kontak: {t.emailOwner || "-"} · {t.telepon || "-"} {boleh("pii.tampilkan") && <TombolPii jenis="seller" id={t.id} label="Tampilkan kontak" />}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {boleh("seller.tangguhkan") && (t.status === "suspended" ? <Tombol onClick={() => setModal("aktifkan")}>Aktifkan kembali</Tombol> : <Tombol tipe="bahaya" onClick={() => setModal("tangguhkan")}>Tangguhkan</Tombol>)}
                {boleh("seller.paket") && <Tombol tipe="utama" onClick={() => setModal("set_paket")}>Beri paket Pro</Tombol>}
                {boleh("seller.paket") && pro && <Tombol onClick={() => setModal("cabut_paket")}>Cabut Pro</Tombol>}
                {boleh("seller.verifikasi") && (t.is_verified ? <Tombol onClick={() => setModal("cabut_verifikasi")}>Cabut Verified</Tombol> : <Tombol onClick={() => setModal("verifikasi")}>Verifikasi</Tombol>)}
              </div>
            </div>
          </Panel>

          {boleh("keuangan.baca") && k && (
            <Panel judul="Keuangan (dana online yang dipegang platform; COD tidak ikut)" aksi={boleh("keuangan.tulis") && (
              <div className="flex gap-2">
                <Tombol kecil tipe="utama" disabled={k.saldo <= 0} onClick={() => setModal("pencairan")}>Catat pencairan</Tombol>
                <Tombol kecil onClick={() => setModal("koreksi")}>Koreksi</Tombol>
              </div>)}>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Kartu judul="Ditahan" nilai={rupiah(k.ditahan)} />
                <Kartu judul="Dapat dicairkan" nilai={rupiah(k.dapat_dicairkan)} />
                <Kartu judul="Sengketa" nilai={rupiah(k.sengketa)} tipe={k.sengketa ? "bad" : undefined} />
                <Kartu judul="Sudah dicairkan" nilai={rupiah(k.sudah_dicairkan)} />
                <Kartu judul="Saldo" nilai={rupiah(k.saldo)} catatan={`koreksi ${rupiah(k.koreksi)}`} />
              </div>
              <div className="mt-4"><Tabel kosong="Belum ada catatan pencairan/koreksi." baris={data.ledger.map((l) => ({ ...l, __key: l.id }))} kolom={[
                { judul: "Waktu", isi: (l) => tanggal(l.created_at) },
                { judul: "Jenis", isi: (l) => <Lencana teks={l.kind} tipe={l.kind === "pencairan" ? "ok" : "warn"} /> },
                { judul: "Jumlah", kanan: true, isi: (l) => rupiah(l.amount) },
                { judul: "Referensi", isi: (l) => l.reference || "-" },
                { judul: "Catatan", isi: (l) => l.note || "-" },
              ]} /></div>
            </Panel>
          )}

          <Panel judul={`Komplain & retur (${data.kasus.length})`}>
            <Tabel kosong="Tidak ada komplain/retur." baris={data.kasus.map((x) => ({ ...x, __key: `${x.jenis}:${x.id}` }))} kolom={[
              { judul: "Jenis", isi: (x) => <div className="space-y-1"><Lencana teks={x.jenis} tipe={x.jenis === "retur" ? "info" : "warn"} />{x.mintaCs && <div><Lencana teks="Minta CS" tipe="bad" /></div>}</div> },
              { judul: "Pembeli", isi: (x) => <div>{x.nama}<p className="text-[11px] text-[#8B8D85]">{x.telepon}</p></div> },
              { judul: "Isi", isi: (x) => <div className="max-w-xs"><p className="font-medium">{x.alasan}</p><p className="text-xs text-[#5B6472] whitespace-pre-wrap break-words">{x.deskripsi}</p></div> },
              { judul: "Status", isi: (x) => <Lencana teks={ST_KASUS[x.status]?.[0] || x.status} tipe={ST_KASUS[x.status]?.[1]} /> },
              { judul: "Masuk", isi: (x) => tanggal(x.dibuat) },
              { judul: "", isi: (x) => boleh("komplain.tulis") ? <Tombol kecil tipe="utama" onClick={() => setModal(x)}>Putuskan</Tombol> : null },
            ]} />
          </Panel>

          {boleh("langganan.baca") && (
            <Panel judul="Riwayat langganan">
              <Tabel kosong="Belum pernah berlangganan." baris={data.langganan.map((p) => ({ ...p, __key: p.order_id }))} kolom={[
                { judul: "Order", isi: (p) => <span className="font-mono text-xs">{p.order_id}</span> },
                { judul: "Periode", isi: (p) => `${p.period_months} bln` },
                { judul: "Jumlah", kanan: true, isi: (p) => p.amount ? rupiah(p.amount) : "Gratis (manual)" },
                { judul: "Sumber", isi: (p) => <Lencana teks={p.provider} /> },
                { judul: "Status", isi: (p) => <Lencana teks={ST_BAYAR[p.status]?.[0] || p.status} tipe={ST_BAYAR[p.status]?.[1]} /> },
                { judul: "Dibuat", isi: (p) => tanggal(p.created_at) },
              ]} />
            </Panel>
          )}

          <Panel judul="Pesanan terbaru (40)">
            <Tabel kosong="Belum ada pesanan." baris={data.pesanan.map((o) => ({ ...o, __key: o.id }))} kolom={[
              { judul: "Produk", isi: (o) => <div><p>{o.product_name}{o.variant_name ? ` · ${o.variant_name}` : ""} ×{o.quantity}</p><p className="text-[11px] text-[#8B8D85]">{o.midtrans_order_id}</p></div> },
              { judul: "Pembeli", isi: (o) => <div>{o.buyer_name}<p className="text-[11px] text-[#8B8D85]">{o.buyer_phone} · {o.destination_label || ""}</p></div> },
              { judul: "Total", kanan: true, isi: (o) => rupiah(o.total_price) },
              { judul: "Status", isi: (o) => <div className="space-y-1"><Lencana teks={o.status} tipe={ST_PESANAN[o.status] || "abu"} />{o.payment_method === "cod" && <div><Lencana teks={o.cod_paid_at ? "COD lunas" : "COD"} tipe="info" /></div>}</div> },
              { judul: "Sumber", isi: (o) => o.ref_source || "-" },
              { judul: "Dibuat", isi: (o) => tanggal(o.created_at) },
              { judul: "", isi: (o) => boleh("pii.tampilkan") ? <TombolPii jenis="order" id={o.id} /> : null },
            ]} />
          </Panel>
        </div>
      )}
      {cfg && (
        <ModalAksi judul={cfg.judul} deskripsi={cfg.deskripsi} field={cfg.field} tombol={cfg.tombol} bahaya={cfg.bahaya}
          onTutup={(sukses) => { setModal(null); if (sukses) muatUlang(); }} onKirim={cfg.kirim} />
      )}
    </AdminShell>
  );
}
