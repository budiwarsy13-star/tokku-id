// Helper paket untuk SERVER (route API & cron). Selalu pakai client service-role (`db`).
import { isPro } from "@/lib/plans";

export async function ambilPlanToko(db, storeId) {
  const { data } = await db.from("stores").select("id, plan, plan_expires_at").eq("id", storeId).maybeSingle();
  return { ...(data || {}), pro: isPro(data) }; // gagal baca = dianggap Gratis (aman)
}

// Pakai 1 kuota bulanan secara atomik (fungsi SQL pakai_kuota). true = boleh lanjut.
// Kalau pengecekan kuota sendiri error, fitur tetap jalan (dicatat di log) supaya
// masalah teknis tidak menghentikan seller; batas biayanya tetap dijaga RPC saat normal.
export async function pakaiKuota(db, storeId, kunci, batas) {
  const { data, error } = await db.rpc("pakai_kuota", { p_store: String(storeId), p_key: kunci, p_batas: batas });
  if (error) {
    console.error(`pakaiKuota(${kunci}) error:`, error.message);
    return true;
  }
  return data === true;
}

// Tambah N bulan, tanggalnya dijepit ke akhir bulan (31 Jan + 1 bulan = 28/29 Feb, bukan 3 Mar).
export function tambahBulan(tanggal, n) {
  const d = new Date(tanggal.getTime());
  const hari = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const akhir = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(hari, akhir));
  return d;
}

// Dipanggil saat pembayaran langganan terkonfirmasi (webhook). Idempotent: webhook yang
// dikirim 2x tidak memperpanjang 2x. `nominal` (kalau ada) harus sama dengan tagihan.
export async function aktifkanPaket(db, orderId, nominal = null) {
  const { data: bayar } = await db.from("plan_payments").select("*").eq("order_id", orderId).maybeSingle();
  if (!bayar) return { ok: false, alasan: "tagihan_tidak_ditemukan" };
  if (nominal != null && Math.round(Number(nominal)) !== Number(bayar.amount)) {
    console.error(`Nominal langganan beda (${orderId}): bayar ${nominal} vs tagihan ${bayar.amount}`);
    return { ok: false, alasan: "nominal_beda" };
  }

  // Klaim: hanya request pertama yang berhasil mengubah status ke 'paid'.
  const { data: diubah } = await db.from("plan_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("order_id", orderId).neq("status", "paid").select("id");
  if (!diubah || diubah.length === 0) return { ok: true, sudahDiproses: true };

  const { data: toko } = await db.from("stores").select("plan, plan_expires_at").eq("id", bayar.store_id).maybeSingle();
  const sekarang = new Date();
  const dasar = toko?.plan === "pro" && toko.plan_expires_at && new Date(toko.plan_expires_at) > sekarang
    ? new Date(toko.plan_expires_at) // perpanjang dari sisa masa aktif, bukan dari hari ini
    : sekarang;
  const baru = tambahBulan(dasar, bayar.period_months);

  const { error } = await db.from("stores").update({ plan: "pro", plan_expires_at: baru.toISOString() }).eq("id", bayar.store_id);
  if (error) {
    // Kembalikan ke pending supaya webhook berikutnya bisa mencoba lagi.
    await db.from("plan_payments").update({ status: "pending", paid_at: null }).eq("order_id", orderId);
    console.error("Gagal mengaktifkan paket:", error.message);
    return { ok: false, alasan: "gagal_update_toko" };
  }
  return { ok: true, expires: baru };
}

export async function tandaiTagihanGagal(db, orderId, status = "failed") {
  await db.from("plan_payments").update({ status }).eq("order_id", orderId).eq("status", "pending");
}
