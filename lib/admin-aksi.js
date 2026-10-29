// Logika AKSI admin (mengubah data). Terpisah dari route supaya bisa diuji dengan database tiruan.
// ATURAN BAJA untuk semua aksi:
//  1) input divalidasi ketat; alasan wajib (kecuali dikatakan lain),
//  2) admin TIDAK boleh bertindak atas toko miliknya sendiri,
//  3) log audit ditulis SEBELUM perubahan — kalau log gagal, aksi dibatalkan (tidak ada perubahan tanpa jejak).
import { catatAudit, validasiId, validasiAlasan, validasiInt, bentrokKepentingan, maskEmail, maskTelepon } from "@/lib/admin-server";
import { aktifkanPaket, tandaiTagihanGagal } from "@/lib/plan-server";
import { statusMidtrans, klasifikasiStatusMidtrans } from "@/lib/admin-data";

const res = (status, body) => ({ status, body });
const gagal = (status, message, kode = "INPUT") => res(status, { success: false, kode, message });
const HARI_MS = 86_400_000;

// Masa aktif paket yang sedang berjalan (ms), dari SISTEM MANA PUN: 'pro' + plan_expires_at (lib/plans.js)
// atau 'berbayar' + plan_aktif_sampai (lib/plan.js). 0 = tidak sedang berlangganan.
export function akhirPaketAktif(t, nowMs) {
  const a = t?.plan === "pro" && t.plan_expires_at ? new Date(t.plan_expires_at).getTime() : 0;
  const b = t?.plan === "berbayar" && t.plan_aktif_sampai ? new Date(t.plan_aktif_sampai).getTime() : 0;
  const m = Math.max(a || 0, b || 0);
  return m > nowMs ? m : 0;
}

async function ambilToko(db, storeId) {
  const { data } = await db.from("stores").select("id, name, user_id, status, plan, plan_expires_at, plan_aktif_sampai, is_verified").eq("id", storeId).maybeSingle();
  return data || null;
}
async function notifSeller(db, storeId, title, message) {
  try { await db.from("notifications").insert({ store_id: storeId, type: "admin_info", title, message, url: "/dashboard" }); } catch { /* notifikasi bukan bagian kritis */ }
}

// ---------------------------------------------------------------- SELLER
const AKSI_SELLER = ["tangguhkan", "aktifkan", "set_paket", "cabut_paket", "verifikasi", "cabut_verifikasi"];

export async function aksiSeller({ db, admin, storeId, aksi, alasan, hari, ip, ua, sekarang = () => Date.now() }) {
  const id = validasiId(storeId);
  if (!id) return gagal(400, "ID toko tidak valid.");
  if (!AKSI_SELLER.includes(aksi)) return gagal(400, "Aksi tidak dikenal.");
  const why = validasiAlasan(alasan);
  if (!why) return gagal(400, "Alasan wajib diisi (8-500 karakter).");
  let jumlahHari = null;
  if (aksi === "set_paket") {
    jumlahHari = validasiInt(hari, { min: 1, max: 3650 });
    if (!jumlahHari) return gagal(400, "Jumlah hari harus bilangan bulat 1-3650.");
  }

  const toko = await ambilToko(db, id);
  if (!toko) return gagal(404, "Toko tidak ditemukan.", "TIDAK_ADA");
  if (bentrokKepentingan(admin, toko)) return gagal(403, "Tidak boleh bertindak atas toko milik sendiri.", "BENTROK_KEPENTINGAN");

  let perubahan, pesan;
  const nowMs = sekarang();
  if (aksi === "tangguhkan") {
    if (toko.status === "suspended") return gagal(409, "Toko sudah ditangguhkan.", "SUDAH");
    perubahan = { status: "suspended" };
    pesan = ["Toko ditangguhkan sementara", "Tokomu ditangguhkan sementara oleh tim tokku.id. Hubungi dukungan untuk informasi lebih lanjut."];
  } else if (aksi === "aktifkan") {
    if (toko.status !== "suspended") return gagal(409, "Toko tidak sedang ditangguhkan.", "SUDAH");
    perubahan = { status: "active" };
    pesan = ["Toko diaktifkan kembali", "Tokomu sudah aktif kembali dan bisa menerima pesanan."];
  } else if (aksi === "set_paket") {
    const dasar = akhirPaketAktif(toko, nowMs) || nowMs; // perpanjang dari sisa masa aktif sistem mana pun
    const sampai = new Date(dasar + jumlahHari * HARI_MS).toISOString();
    // Ditulis ke 'pro' (yang dibaca penegakan fitur: trigger SQL, WA Blast, Cart Recovery, dll.) dan kedua kolom tanggal
    // disamakan supaya data tetap koheren.
    perubahan = { plan: "pro", plan_expires_at: sampai, plan_aktif_sampai: sampai };
    pesan = ["Paket Pro diaktifkan", `Paket Pro aktif ${jumlahHari} hari dari tim tokku.id.`];
  } else if (aksi === "cabut_paket") {
    perubahan = { plan: "free", plan_expires_at: null, plan_aktif_sampai: null };
    pesan = ["Paket Pro dicabut", "Paket tokomu dikembalikan ke Gratis oleh tim tokku.id."];
  } else if (aksi === "verifikasi") {
    perubahan = { is_verified: true };
  } else {
    perubahan = { is_verified: false };
  }

  // 1) JEJAK DULU — gagal mencatat = batal.
  const sebelum = { status: toko.status, plan: toko.plan, plan_expires_at: toko.plan_expires_at, plan_aktif_sampai: toko.plan_aktif_sampai, is_verified: toko.is_verified };
  try {
    await catatAudit(db, { admin, aksi: `seller.${aksi}`, targetType: "store", targetId: id, alasan: why, detail: { toko: toko.name, sebelum, sesudah: perubahan, hari: jumlahHari }, ip, ua });
  } catch (e) {
    console.error(e.message);
    return gagal(500, "Aksi dibatalkan: log audit tidak bisa ditulis.", "AUDIT_GAGAL");
  }

  // 2) Baru ubah data
  const { error } = await db.from("stores").update(perubahan).eq("id", id);
  if (error) {
    try { await catatAudit(db, { admin, aksi: `seller.${aksi}.gagal`, targetType: "store", targetId: id, detail: { error: error.message }, ip, ua }); } catch {}
    return gagal(500, "Gagal menyimpan perubahan.", "ERROR");
  }
  if (aksi === "set_paket") {
    try {
      await db.from("plan_payments").insert({ store_id: id, order_id: `MAN-${nowMs.toString(36)}-${id.slice(0, 6)}`, provider: "manual", period_months: Math.max(1, Math.round(jumlahHari / 30)), amount: 0, status: "paid", paid_at: new Date(nowMs).toISOString() });
    } catch { /* riwayat tambahan, bukan bagian kritis */ }
  }
  if (pesan) await notifSeller(db, id, pesan[0], pesan[1]);
  return res(200, { success: true, perubahan });
}

// ---------------------------------------------------------------- LANGGANAN (sinkron ke Midtrans)
export async function sinkronLangganan({ db, admin, orderId, ip, ua, ambilStatus = statusMidtrans }) {
  const oid = validasiId(orderId);
  if (!oid || !oid.startsWith("SUB-")) return gagal(400, "Order ID langganan tidak valid.");
  const { data: bayar } = await db.from("plan_payments").select("order_id, provider, status, store_id, amount").eq("order_id", oid).maybeSingle();
  if (!bayar) return gagal(404, "Tagihan tidak ditemukan.", "TIDAK_ADA");
  if (bayar.provider !== "midtrans") return gagal(400, "Sinkron otomatis baru didukung untuk tagihan Midtrans.", "TIDAK_DIDUKUNG");
  if (bayar.status === "paid") return res(200, { success: true, hasil: "sudah_lunas" });

  try {
    await catatAudit(db, { admin, aksi: "langganan.sinkron", targetType: "plan_payment", targetId: oid, detail: { storeId: bayar.store_id, statusLama: bayar.status }, ip, ua });
  } catch (e) {
    console.error(e.message);
    return gagal(500, "Aksi dibatalkan: log audit tidak bisa ditulis.", "AUDIT_GAGAL");
  }

  const st = await ambilStatus(oid);
  if (!st.httpOk || String(st.data?.status_code) === "404") return gagal(502, "Midtrans tidak mengenali transaksi ini atau sedang tidak bisa dihubungi.", "MIDTRANS");
  const kelas = klasifikasiStatusMidtrans(st.data);
  if (kelas === "paid") {
    // Nominal dari MIDTRANS dicocokkan dengan tagihan (aktifkanPaket menolak kalau beda).
    const r = await aktifkanPaket(db, oid, st.data.gross_amount);
    if (!r.ok) return gagal(409, `Tidak diaktifkan: ${r.alasan}.`, "DITOLAK");
    return res(200, { success: true, hasil: "diaktifkan" });
  }
  if (kelas === "expired" || kelas === "failed") {
    await tandaiTagihanGagal(db, oid, kelas);
    return res(200, { success: true, hasil: kelas });
  }
  return res(200, { success: true, hasil: "masih_menunggu" });
}

// ---------------------------------------------------------------- KOMPLAIN / RETUR
export async function aksiKomplain({ db, admin, jenis, id, status, catatan, ip, ua }) {
  if (!["komplain", "retur"].includes(jenis)) return gagal(400, "Jenis harus komplain atau retur.");
  const kid = validasiId(id);
  if (!kid) return gagal(400, "ID kasus tidak valid.");
  if (!["diproses", "selesai", "ditolak"].includes(status)) return gagal(400, "Status tidak valid.");
  const note = validasiAlasan(catatan, status === "diproses" ? 0 : 8) ?? (status === "diproses" && !catatan ? "" : null);
  if (note === null) return gagal(400, "Catatan keputusan wajib diisi (8-500 karakter) untuk status selesai/ditolak.");

  const tabel = jenis === "komplain" ? "complaints" : "order_returns";
  const { data: kasus } = await db.from(tabel).select("id, store_id, order_id").eq("id", kid).maybeSingle();
  if (!kasus) return gagal(404, "Kasus tidak ditemukan.", "TIDAK_ADA");
  const toko = await ambilToko(db, kasus.store_id);
  if (toko && bentrokKepentingan(admin, toko)) return gagal(403, "Tidak boleh memutus kasus pada toko milik sendiri.", "BENTROK_KEPENTINGAN");

  try {
    await catatAudit(db, { admin, aksi: `komplain.${status}`, targetType: jenis, targetId: kid, alasan: note || null, detail: { storeId: kasus.store_id, orderId: kasus.order_id }, ip, ua });
  } catch (e) {
    console.error(e.message);
    return gagal(500, "Aksi dibatalkan: log audit tidak bisa ditulis.", "AUDIT_GAGAL");
  }
  const { error } = await db.from("admin_cases").upsert({ kind: jenis, case_id: String(kid), status, note: note || null, updated_by: admin.id, updated_at: new Date().toISOString() }, { onConflict: "kind,case_id" });
  if (error) return gagal(500, "Gagal menyimpan keputusan.", "ERROR");
  if (status !== "diproses") await notifSeller(db, kasus.store_id, `Keputusan ${jenis}`, `Tim tokku.id memutuskan ${jenis} pada pesanan ini: ${status}.`);
  return res(200, { success: true });
}

// ---------------------------------------------------------------- KEUANGAN
export async function aksiKeuangan({ db, admin, storeId, jenis, jumlah, referensi, catatan, ip, ua }) {
  const id = validasiId(storeId);
  if (!id) return gagal(400, "ID toko tidak valid.");
  if (!["pencairan", "koreksi"].includes(jenis)) return gagal(400, "Jenis harus pencairan atau koreksi.");
  const n = jenis === "pencairan" ? validasiInt(jumlah, { min: 1, max: 1_000_000_000 }) : validasiInt(jumlah, { min: -1_000_000_000, max: 1_000_000_000 });
  if (n === null || n === 0) return gagal(400, jenis === "pencairan" ? "Jumlah pencairan harus bilangan bulat positif." : "Jumlah koreksi harus bilangan bulat bukan nol.");
  const ref = String(referensi ?? "").trim();
  if (jenis === "pencairan" && !/^[\w\-./ ]{3,60}$/.test(ref)) return gagal(400, "Nomor referensi transfer wajib (3-60 karakter huruf/angka/-./).");
  const note = jenis === "koreksi" ? validasiAlasan(catatan) : String(catatan ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 300);
  if (jenis === "koreksi" && !note) return gagal(400, "Catatan koreksi wajib diisi (8-500 karakter).");

  const toko = await ambilToko(db, id);
  if (!toko) return gagal(404, "Toko tidak ditemukan.", "TIDAK_ADA");
  if (bentrokKepentingan(admin, toko)) return gagal(403, "Tidak boleh mencatat keuangan toko milik sendiri.", "BENTROK_KEPENTINGAN");

  try {
    await catatAudit(db, { admin, aksi: `keuangan.${jenis}`, targetType: "store", targetId: id, alasan: note || null, detail: { toko: toko.name, jumlah: n, referensi: ref || null }, ip, ua });
  } catch (e) {
    console.error(e.message);
    return gagal(500, "Aksi dibatalkan: log audit tidak bisa ditulis.", "AUDIT_GAGAL");
  }
  const { data: ledgerId, error } = await db.rpc("admin_ledger_tambah", { p_store: id, p_kind: jenis, p_amount: n, p_ref: ref || null, p_note: note || null, p_admin: admin.id });
  if (error) {
    const pesan = String(error.message || "");
    if (error.code === "23505") return gagal(409, "Nomor referensi transfer ini sudah pernah dicatat untuk toko ini.", "DUPLIKAT");
    if (pesan.includes("[DITOLAK]")) return gagal(409, pesan.replace(/^.*\[DITOLAK\]\s*/, ""), "DITOLAK");
    return gagal(500, "Gagal mencatat ke buku besar.", "ERROR");
  }
  return res(200, { success: true, ledgerId });
}

// ---------------------------------------------------------------- DATA PRIBADI (tampilkan = wajib alasan + tercatat)
export async function tampilkanPii({ db, admin, jenis, id, alasan, ip, ua }) {
  if (!["order", "komplain", "seller"].includes(jenis)) return gagal(400, "Jenis tidak valid.");
  const kid = validasiId(id);
  if (!kid) return gagal(400, "ID tidak valid.");
  const why = validasiAlasan(alasan);
  if (!why) return gagal(400, "Alasan membuka data pribadi wajib diisi (8-500 karakter).");

  let baris;
  if (jenis === "order") baris = (await db.from("orders").select("id, store_id, buyer_name, buyer_phone, full_address").eq("id", kid).maybeSingle()).data;
  else if (jenis === "komplain") baris = (await db.from("complaints").select("id, store_id, buyer_name, buyer_phone").eq("id", kid).maybeSingle()).data;
  else baris = (await db.from("stores").select("id, user_id, wa_number").eq("id", kid).maybeSingle()).data;
  if (!baris) return gagal(404, "Data tidak ditemukan.", "TIDAK_ADA");

  // Catat DULU. Kalau log gagal, data pribadi TIDAK dikeluarkan.
  try {
    await catatAudit(db, { admin, aksi: "pii.tampilkan", targetType: jenis, targetId: kid, alasan: why, ip, ua });
  } catch (e) {
    console.error(e.message);
    return gagal(500, "Dibatalkan: log audit tidak bisa ditulis.", "AUDIT_GAGAL");
  }

  if (jenis === "seller") {
    let email = "";
    try { email = (await db.auth.admin.getUserById(baris.user_id)).data?.user?.email || ""; } catch { /* kosong */ }
    return res(200, { success: true, data: { email, telepon: baris.wa_number || "" } });
  }
  return res(200, { success: true, data: { nama: baris.buyer_name || "", telepon: baris.buyer_phone || "", alamat: baris.full_address || "" } });
}

export { maskEmail, maskTelepon };
