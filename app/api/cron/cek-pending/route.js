import { createClient } from "@supabase/supabase-js";
import { kirimPush } from "@/lib/push-server";
import { kembalikanStok } from "@/lib/stock-server";

// Dipanggil otomatis tiap hari jam 3 pagi oleh Vercel Cron (lihat vercel.json).
// Tugasnya ada 2:
// 1. Cari order yang udah dibayar (paid) tapi belum dikirim (shipped) lebih
//    dari 24 jam, kirim reminder ke seller.
// 2. SAFETY NET: bersihin order yang "nyangkut" status pending kelamaan —
//    normalnya ini udah ke-handle otomatis lewat webhook "expire" Midtrans
//    (transaksi di-set expired 2 jam di /api/checkout), tapi kalau webhook-nya
//    entah kenapa gak pernah nyampe (jaringan, dll), order & stok yang
//    "direservasi" bisa nyangkut selamanya tanpa ini.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  // Lindungi endpoint ini biar gak sembarang orang bisa trigger.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Bagian 1: reminder pesanan yang belum dikirim >24 jam ---
  const batasWaktu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: overdueOrders, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("status", "paid")
    .eq("shipping_deadline_notified", false)
    .lte("paid_at", batasWaktu);

  if (error) {
    console.error("Cron cek-pending error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  let jumlahReminder = 0;
  if (overdueOrders && overdueOrders.length > 0) {
    // Kelompokkan per midtrans_order_id — 1 transaksi cart bisa punya beberapa
    // baris order (beberapa produk), tapi cuma butuh 1 notifikasi reminder.
    const grup = {};
    for (const order of overdueOrders) {
      const key = order.midtrans_order_id || order.id;
      if (!grup[key]) grup[key] = [];
      grup[key].push(order);
    }

    for (const key of Object.keys(grup)) {
      const rows = grup[key];
      const first = rows[0];
      const ringkasanProduk = rows.length === 1
        ? first.product_name
        : `${first.product_name} + ${rows.length - 1} produk lainnya`;

      await supabaseAdmin.from("notifications").insert({
        store_id: first.store_id,
        order_id: first.id,
        type: "order_pending",
        title: "Pesanan harus segera dikirim",
        message: `Pesanan ${ringkasanProduk} dari ${first.buyer_name} sudah dibayar lebih dari 24 jam dan belum dikirim.`,
      });

      await kirimPush(supabaseAdmin, first.store_id, {
        title: "⚠️ Pesanan harus segera dikirim",
        message: `${ringkasanProduk} dari ${first.buyer_name} udah lewat 24 jam belum dikirim.`,
        url: "/dashboard/pesanan",
        orderId: first.id,
      });

      await supabaseAdmin.from("orders").update({ shipping_deadline_notified: true }).eq("midtrans_order_id", key);
    }
    jumlahReminder = Object.keys(grup).length;
  }

  // --- Bagian 2: safety net, batalin order yang nyangkut pending >3 jam ---
  // (3 jam = buffer di atas expiry Midtrans 2 jam, biar gak ke-cancel pas
  // webhook-nya masih dalam perjalanan/delay wajar)
  const batasPending = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  const { data: stuckOrders } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("status", "pending")
    .lte("created_at", batasPending);

  let jumlahDibatalkanOtomatis = 0;
  if (stuckOrders && stuckOrders.length > 0) {
    const grupStuck = {};
    for (const order of stuckOrders) {
      const key = order.midtrans_order_id || order.id;
      if (!grupStuck[key]) grupStuck[key] = [];
      grupStuck[key].push(order);
    }

    for (const key of Object.keys(grupStuck)) {
      const rows = grupStuck[key];
      await supabaseAdmin.from("orders").update({ status: "gagal" }).eq("midtrans_order_id", key).eq("status", "pending");
      for (const order of rows) {
        await kembalikanStok(supabaseAdmin, order.product_id, order.variant_name, order.quantity);
      }
    }
    jumlahDibatalkanOtomatis = Object.keys(grupStuck).length;
  }

  return Response.json({
    message: "Selesai.",
    reminder_terkirim: jumlahReminder,
    order_nyangkut_dibatalkan: jumlahDibatalkanOtomatis,
  });
}