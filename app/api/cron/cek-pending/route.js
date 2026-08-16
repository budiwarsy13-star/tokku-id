import { createClient } from "@supabase/supabase-js";
import { kirimPush } from "@/lib/push-server";

// Dipanggil otomatis tiap jam oleh Vercel Cron (lihat vercel.json).
// Tugasnya: cari order yang udah dibayar (paid) tapi belum dikirim (shipped)
// lebih dari 24 jam, terus kirim notifikasi ke seller kalau belum pernah dikirim sebelumnya.
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

  if (!overdueOrders || overdueOrders.length === 0) {
    return Response.json({ message: "Tidak ada order yang melewati batas waktu.", count: 0 });
  }

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

    await supabaseAdmin
      .from("orders")
      .update({ shipping_deadline_notified: true })
      .eq("midtrans_order_id", key);
  }

  return Response.json({ message: "Notifikasi terkirim.", count: Object.keys(grup).length });
}