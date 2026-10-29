import { createClient } from "@supabase/supabase-js";
import { isPro } from "@/lib/plans";
import { kirimPesanWA, SITE_URL, tokenWA } from "@/lib/wa-server";

// REMINDER BAYAR via WhatsApp (Cart Recovery — fitur PRO, lihat lib/plans.js).
// Cari order online `pending` yang umurnya 30-100 menit & belum pernah dikirimi reminder, lalu kirim
// 1 WA ke buyer berisi link bayar Midtrans. Batas atas 100 menit karena transaksi Midtrans expired
// 2 jam (lihat /api/checkout) — lewat itu, ngajak bayar percuma. Order COD (status `cod`) gak masuk.
//
// PENTING — endpoint ini WAJIB dipanggil tiap ~10-15 menit dan TIDAK ada di vercel.json:
// Vercel Hobby cuma mengizinkan cron 1x/hari (cron lebih sering bikin deploy GAGAL), dan paket Pro
// baru boleh per-menit. Pakai scheduler eksternal (mis. cron-job.org, gratis) yang hit URL
//   GET https://<domain>/api/cron/cart-recovery   dengan header   Authorization: Bearer <CRON_SECRET>
//
// Env: WA_API_KEY (token device Fonnte; FONNTE_TOKEN juga diterima), CRON_SECRET.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MIN_UMUR_MENIT = 30;
const MAX_UMUR_MENIT = 100;
const MAX_PER_RUN = 30; // jaga biar gak kena timeout / rate limit Fonnte

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!tokenWA()) {
    return Response.json({ error: "WA_API_KEY belum di-set di environment." }, { status: 500 });
  }

  const sekarang = Date.now();
  const batasBawah = new Date(sekarang - MAX_UMUR_MENIT * 60 * 1000).toISOString();
  const batasAtas = new Date(sekarang - MIN_UMUR_MENIT * 60 * 1000).toISOString();

  const { data: pendingOrders, error } = await supabaseAdmin
    .from("orders")
    .select("*, stores(name, slug, plan, plan_expires_at)")
    .eq("status", "pending")
    .eq("payment_method", "online")
    .is("cart_recovery_sent_at", null)
    .gte("created_at", batasBawah)
    .lte("created_at", batasAtas)
    .limit(200);

  if (error) {
    console.error("Cron cart-recovery error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 1 transaksi = beberapa baris orders -> 1 pesan per midtrans_order_id.
  const grup = {};
  for (const o of pendingOrders || []) {
    (grup[o.midtrans_order_id || o.id] ||= []).push(o);
  }

  // Toko yang ditangguhkan admin tidak boleh mengirim WA. Query terpisah & toleran: kalau kolom status
  // belum ada (SQL admin belum dijalankan) hasilnya kosong, bukan error.
  const { data: ditangguhkan } = await supabaseAdmin.from("stores").select("id").eq("status", "suspended");
  const idDitangguhkan = new Set((ditangguhkan || []).map((t) => String(t.id)));

  let terkirim = 0, gagal = 0, dilewati = 0;
  const keys = Object.keys(grup).slice(0, MAX_PER_RUN);

  for (const key of keys) {
    const rows = grup[key];
    const first = rows[0];

    // Fitur berbayar: toko gratis dilewati (tanpa menandai, jadi kalau nanti upgrade masih dalam jendela waktu bisa terkirim).
    if (!isPro(first.stores)) { dilewati++; continue; }
    if (idDitangguhkan.has(String(first.store_id))) { dilewati++; continue; } // toko ditangguhkan admin

    // KLAIM dulu: update bersyarat (cart_recovery_sent_at masih null) -> kalau 2 run cron tumpang tindih,
    // cuma salah satu yang menang dan mengirim. Gagal kirim -> klaim dilepas supaya dicoba lagi.
    const { data: klaim } = await supabaseAdmin.from("orders")
      .update({ cart_recovery_sent_at: new Date().toISOString() })
      .eq("midtrans_order_id", key).eq("status", "pending").is("cart_recovery_sent_at", null).select("id");
    if (!klaim || klaim.length === 0) continue;

    const namaToko = first.stores?.name || "toko";
    const ringkasan = rows.length === 1 ? first.product_name : `${first.product_name} + ${rows.length - 1} produk lainnya`;
    const total = rows.reduce((s, r) => s + Number(r.total_price), 0);
    const linkBayar = first.payment_url || `${SITE_URL}/${first.stores?.slug || ""}`;

    const pesan =
      `Halo ${first.buyer_name}! 👋\n\n` +
      `Pesananmu di *${namaToko}* belum selesai dibayar:\n` +
      `🛍️ ${ringkasan}\n` +
      `💰 Total: Rp${total.toLocaleString("id-ID")}\n\n` +
      `Selesaikan pembayaran di sini ya (berlaku sebentar lagi):\n${linkBayar}\n\n` +
      `Kalau ada kendala, balas pesan ini. Terima kasih! 🙏`;

    const hasil = await kirimPesanWA(first.buyer_phone, pesan);
    if (hasil.ok) {
      terkirim++;
    } else {
      console.error(`Cart recovery gagal (${key}):`, hasil.detail);
      // Nomor gak valid = percuma dicoba lagi -> biarkan tertandai. Selain itu, lepas klaim.
      if (hasil.detail !== "Nomor WA tidak valid.") {
        await supabaseAdmin.from("orders").update({ cart_recovery_sent_at: null }).eq("midtrans_order_id", key).eq("status", "pending");
      }
      gagal++;
    }
  }

  return Response.json({ message: "Selesai.", kandidat: Object.keys(grup).length, terkirim, gagal, dilewatiPaketGratis: dilewati });
}
