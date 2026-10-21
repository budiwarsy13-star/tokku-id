// Webhook Midtrans (server-to-server). Gabungan dari 2 versi yang sempat
// bercabang: versi lama di project ini (cuma update status + WA notify ke
// seller) + versi yang dibikin di sesi lain (fraud-check, anti-double-webhook,
// restore stok, tracking Meta/GA4). Semuanya digabung di sini, WA notify
// ke seller tetap dipertahankan sesuai arahan.
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { kirimPush } from "@/lib/push-server";
import { kembalikanStok } from "@/lib/stock-server";
import { aktifkanPaket, tandaiTagihanGagal } from "@/lib/plan-server";
import { isPro } from "@/lib/plans";
import { kirimNotifWA } from "@/lib/wa-notify-server";

// Service role, BUKAN client biasa -- ini request server-to-server dari
// Midtrans (bukan dari browser), dan update ke tabel orders harus bisa
// tembus RLS. (Versi lama sempat pakai `supabase` client biasa dari
// "@/lib/supabase", yang berisiko ketahan RLS dan gagal update diam-diam.)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Kirim event Purchase server-side -- sinyal paling diandalkan buat algoritma
// iklan (beda dari tracking client yang bisa gagal kalau pembeli nutup
// browser sebelum nyampe halaman sukses). No-op kalau seller belum setting
// pixel/measurement ID di dashboard-nya.
async function kirimPurchaseServerSide(store, orderRows, grossAmount) {
  const eventTime = Math.floor(Date.now() / 1000);
  const first = orderRows[0];
  const contentIds = orderRows.map((o) => o.product_id);

  // Meta Conversions API -- butuh Pixel ID + access token yang seller
  // generate sendiri di Meta Events Manager.
  if (store.meta_pixel_id && store.meta_access_token) {
    try {
      const hashedPhone = first.buyer_phone
        ? crypto.createHash("sha256").update(first.buyer_phone.replace(/\D/g, "")).digest("hex")
        : undefined;
      await fetch(`https://graph.facebook.com/v21.0/${store.meta_pixel_id}/events?access_token=${store.meta_access_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [{
            event_name: "Purchase",
            event_time: eventTime,
            action_source: "website",
            event_id: first.midtrans_order_id,
            user_data: hashedPhone ? { ph: [hashedPhone] } : {},
            custom_data: {
              currency: "IDR",
              value: grossAmount,
              content_ids: contentIds,
              content_type: "product",
            },
          }],
        }),
      });
    } catch (err) {
      console.error("Gagal kirim Meta Conversions API:", err.message);
    }
  }

  // GA4 Measurement Protocol -- butuh Measurement ID + API secret (dibuat
  // seller di GA4 Admin > Data Streams > Measurement Protocol API secrets).
  if (store.ga4_measurement_id && store.ga4_api_secret) {
    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${store.ga4_measurement_id}&api_secret=${store.ga4_api_secret}`,
        {
          method: "POST",
          body: JSON.stringify({
            client_id: `tokku-${first.midtrans_order_id}`,
            events: [{
              name: "purchase",
              params: {
                transaction_id: first.midtrans_order_id,
                currency: "IDR",
                value: grossAmount,
                items: orderRows.map((o) => ({ item_id: o.product_id, item_name: o.product_name, quantity: o.quantity })),
              },
            }],
          }),
        }
      );
    } catch (err) {
      console.error("Gagal kirim GA4 Measurement Protocol:", err.message);
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

    // Verifikasi signature biar yakin request ini beneran dari Midtrans.
    const expectedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + process.env.MIDTRANS_SERVER_KEY)
      .digest("hex");
    if (signature_key !== expectedSignature) {
      return Response.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Pembayaran LANGGANAN tokku (bukan pesanan buyer): order_id berawalan "SUB-".
    if (String(order_id).startsWith("SUB-")) {
      if (transaction_status === "settlement" || (transaction_status === "capture" && fraud_status === "accept")) {
        await aktifkanPaket(supabaseAdmin, order_id, gross_amount);
      } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
        await tandaiTagihanGagal(supabaseAdmin, order_id, transaction_status === "expire" ? "expired" : "failed");
      }
      return Response.json({ ok: true });
    }

    let newStatus = null;
    if (transaction_status === "capture") {
      newStatus = fraud_status === "accept" ? "paid" : "pending";
    } else if (transaction_status === "settlement") {
      newStatus = "paid";
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      // "gagal", BUKAN "cancelled" -- biar konsisten sama status yang dipakai
      // di tempat lain (checkout, cron pembatal pesanan, dll).
      newStatus = "gagal";
    } else if (transaction_status === "pending") {
      newStatus = "pending";
    }
    if (!newStatus) return Response.json({ ok: true });

    // LAPISAN PERTAHANAN TERAKHIR: sebelum mark PAID, cocokin nominal yang
    // BENERAN dibayar (gross_amount dari Midtrans) ke total yang SEHARUSNYA
    // (SUM total_price di database, yang udah dihitung server pas checkout).
    // Kalau beda, JANGAN mark paid otomatis -- tandain buat direview manual.
    if (newStatus === "paid") {
      const { data: existingRows } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("midtrans_order_id", order_id);

      if (existingRows && existingRows.length > 0) {
        const totalSeharusnya = existingRows.reduce((sum, o) => sum + Number(o.total_price), 0);
        const totalDibayar = Number(gross_amount);

        if (Math.abs(totalSeharusnya - totalDibayar) > 1) {
          const sudahDireview = existingRows.every((o) => o.status === "perlu_review");
          if (!sudahDireview) {
            await supabaseAdmin.from("orders").update({ status: "perlu_review" }).eq("midtrans_order_id", order_id);
            await supabaseAdmin.from("notifications").insert({
              store_id: existingRows[0].store_id,
              order_id: existingRows[0].id,
              type: "order_pending",
              title: "⚠️ Nominal pembayaran gak cocok — perlu direview",
              message: `Pesanan ${existingRows[0].product_name} seharusnya Rp${totalSeharusnya.toLocaleString("id-ID")}, tapi yang dibayar Rp${totalDibayar.toLocaleString("id-ID")}. JANGAN dikirim dulu sebelum dicek manual.`,
            });
            await kirimPush(supabaseAdmin, existingRows[0].store_id, {
              title: "⚠️ Perlu review manual",
              message: `Ada pesanan dengan nominal gak cocok. Cek dashboard sebelum kirim barang.`,
              url: "/dashboard/pesanan",
              orderId: existingRows[0].id,
            });
          }
          return Response.json({ message: "OK - flagged for review" });
        }
      }
    }

    const updateData = { status: newStatus };
    if (newStatus === "paid") updateData.paid_at = new Date().toISOString();

    // Guard idempotency: exclude baris yang statusnya UDAH sama kayak newStatus.
    // Midtrans kadang ngirim webhook yang sama berkali-kali (retry) -- tanpa
    // ini, notifikasi/push/WA-notify/restore-stok bisa kejalanin dobel buat
    // event yang sama.
    const { data: updatedOrders } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("midtrans_order_id", order_id)
      .neq("status", newStatus)
      .select();

    if (newStatus === "paid" && updatedOrders?.length > 0) {
      const first = updatedOrders[0];
      const totalGabungan = updatedOrders.reduce((sum, o) => sum + Number(o.total_price), 0);
      const ringkasanProduk = updatedOrders.length === 1
        ? first.product_name
        : `${first.product_name} + ${updatedOrders.length - 1} produk lainnya`;

      await supabaseAdmin.from("notifications").insert({
        store_id: first.store_id,
        order_id: first.id,
        type: "pembayaran_masuk",
        title: "Pembayaran diterima",
        message: `Pembayaran untuk ${ringkasanProduk} sebesar Rp${totalGabungan.toLocaleString("id-ID")} sudah masuk.`,
      });

      await kirimPush(supabaseAdmin, first.store_id, {
        title: "Pembayaran diterima",
        message: `Rp${totalGabungan.toLocaleString("id-ID")} dari ${first.buyer_name} untuk ${ringkasanProduk}.`,
        url: "/dashboard/pesanan",
        orderId: first.id,
      });

      // Notif WA ke seller. Dulu: fetch ke /api/wa/notify dengan orderId = ID Midtrans (bukan UUID
      // orders.id) + tanpa autentikasi -> gak pernah jalan. Sekarang dipanggil langsung dari server.
      // Best-effort: gagal kirim jangan bikin webhook error (Midtrans bakal retry padahal sudah paid).
      try {
        await kirimNotifWA(supabaseAdmin, { type: "order_masuk", orderId: first.id });
      } catch (e) {
        console.error("Gagal kirim WA notify ke seller:", e.message);
      }

      // Ambil kredensial tracking toko ini, terus kirim event Purchase server-side.
      // ID publik (pixel / measurement ID) ada di tabel `stores`, tapi TOKEN RAHASIA
      // (meta_access_token, ga4_api_secret) sengaja dipisah ke tabel `store_secrets`
      // supaya gak ikut kebaca publik lewat halaman toko. JANGAN dibalikin ke `stores`.
      const { data: storeIds } = await supabaseAdmin
        .from("stores")
        .select("meta_pixel_id, ga4_measurement_id, plan, plan_expires_at")
        .eq("id", first.store_id)
        .maybeSingle();
      const { data: storeSecrets } = await supabaseAdmin
        .from("store_secrets")
        .select("meta_access_token, ga4_api_secret")
        .eq("store_id", first.store_id)
        .maybeSingle();

      // Tracking server-side (CAPI/GA4) = fitur Pro.
      if (storeIds && isPro(storeIds)) {
        await kirimPurchaseServerSide({ ...storeIds, ...(storeSecrets || {}) }, updatedOrders, totalGabungan);
      }
    }

    // Transaksi gagal/dibatalkan/expired -- kembalikan stok yang sempat
    // "direservasi" (dikurangi) pas order ini dibuat di /api/checkout.
    if (newStatus === "gagal" && updatedOrders?.length > 0) {
      for (const order of updatedOrders) {
        await kembalikanStok(supabaseAdmin, order.product_id, order.variant_name, order.quantity);
      }
    }

    return Response.json({ message: "OK" });
  } catch (error) {
    console.error("Midtrans notification error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
