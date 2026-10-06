import { createClient } from "@supabase/supabase-js";

// CART RECOVERY via WhatsApp (Fonnte).
// Cari order `pending` yang umurnya 30 menit - 100 menit dan belum pernah dikirimi
// pesan recovery, lalu kirim 1 WA ke buyer. Batas atas 100 menit karena link bayar
// Midtrans expired 2 jam (lihat /api/checkout) — lewat itu, ngajak bayar percuma.
//
// PENTING: endpoint ini harus dipanggil tiap ~10-15 menit. Vercel Hobby cuma
// ngizinin cron 1x/hari, jadi pakai scheduler eksternal (mis. cron-job.org) yang
// hit URL ini dengan header `Authorization: Bearer <CRON_SECRET>`.
//
// Env: WA_API_KEY (token device Fonnte), CRON_SECRET (sudah ada).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MIN_UMUR_MENIT = 30;
const MAX_UMUR_MENIT = 100;
const MAX_PER_RUN = 30; // jaga biar gak kena timeout / rate limit Fonnte

function normalisasiTelepon(nomor) {
  let n = String(nomor || "").replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return n;
}

async function kirimWA(target, pesan) {
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { Authorization: process.env.WA_API_KEY },
    body: new URLSearchParams({ target, message: pesan, countryCode: "62" }),
  });
  const data = await res.json().catch(() => ({}));
  // Fonnte balas { status: true/false, reason?: "..." }
  return { ok: res.ok && data.status === true, detail: data.reason || data.detail || "" };
}

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.WA_API_KEY) {
    return Response.json({ error: "WA_API_KEY belum di-set di environment." }, { status: 500 });
  }

  const sekarang = Date.now();
  const batasBawah = new Date(sekarang - MAX_UMUR_MENIT * 60 * 1000).toISOString();
  const batasAtas = new Date(sekarang - MIN_UMUR_MENIT * 60 * 1000).toISOString();

  const { data: pendingOrders, error } = await supabaseAdmin
    .from("orders")
    .select("*, stores(name, slug)")
    .eq("status", "pending")
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
    const key = o.midtrans_order_id || o.id;
    (grup[key] ||= []).push(o);
  }

  let terkirim = 0;
  let gagal = 0;
  const keys = Object.keys(grup).slice(0, MAX_PER_RUN);

  for (const key of keys) {
    const rows = grup[key];
    const first = rows[0];
    const target = normalisasiTelepon(first.buyer_phone);
    const namaToko = first.stores?.name || "toko";
    const ringkasan = rows.length === 1 ? first.product_name : `${first.product_name} + ${rows.length - 1} produk lainnya`;
    const total = rows.reduce((s, r) => s + Number(r.total_price), 0);
    const linkBayar = first.payment_url || `https://tokku-id.vercel.app/${first.stores?.slug || ""}`;

    if (target.length < 10) { // nomor gak valid — tandai biar gak dicoba terus tiap run
      await supabaseAdmin.from("orders").update({ cart_recovery_sent_at: new Date().toISOString() }).eq("midtrans_order_id", key);
      gagal++;
      continue;
    }

    const pesan =
      `Halo ${first.buyer_name}! 👋\n\n` +
      `Pesananmu di *${namaToko}* belum selesai dibayar:\n` +
      `🛍️ ${ringkasan}\n` +
      `💰 Total: Rp${total.toLocaleString("id-ID")}\n\n` +
      `Selesaikan pembayaran di sini ya (berlaku sebentar lagi):\n${linkBayar}\n\n` +
      `Kalau ada kendala, balas pesan ini. Terima kasih! 🙏`;

    const hasil = await kirimWA(target, pesan);
    if (hasil.ok) {
      // Tandai HANYA kalau sukses, supaya yang gagal kirim bisa dicoba lagi di run berikutnya
      // (selama masih dalam jendela waktu).
      await supabaseAdmin
        .from("orders")
        .update({ cart_recovery_sent_at: new Date().toISOString() })
        .eq("midtrans_order_id", key)
        .eq("status", "pending");
      terkirim++;
    } else {
      console.error(`Cart recovery gagal (${key}):`, hasil.detail);
      gagal++;
    }
  }

  return Response.json({
    message: "Selesai.",
    kandidat: Object.keys(grup).length,
    terkirim,
    gagal,
  });
}
