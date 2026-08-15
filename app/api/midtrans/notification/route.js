import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { kirimPush } from "@/lib/push-server";

// Pakai service role di sini karena ini request server-to-server dari Midtrans,
// bukan dari browser user, jadi butuh akses penuh buat update tabel orders.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Kirim event Purchase server-side. Ini sinyal yang PALING diandalkan buat
// algoritma iklan (beda dari trackPurchase di client yang bisa gagal kalau
// pembeli nutup browser) — karena jalan dari webhook, independen dari browser.
async function kirimPurchaseServerSide(store, order) {
  const eventTime = Math.floor(Date.now() / 1000);

  // Meta Conversions API — butuh Pixel ID + access token yang seller generate
  // sendiri di Meta Events Manager (bukan Pixel ID doang, beda dari yang dipasang di client).
  if (store.meta_pixel_id && store.meta_access_token) {
    try {
      const hashedPhone = order.buyer_phone
        ? crypto.createHash("sha256").update(order.buyer_phone.replace(/\D/g, "")).digest("hex")
        : undefined;
      await fetch(`https://graph.facebook.com/v21.0/${store.meta_pixel_id}/events?access_token=${store.meta_access_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [{
            event_name: "Purchase",
            event_time: eventTime,
            action_source: "website",
            event_id: order.midtrans_order_id,
            user_data: hashedPhone ? { ph: [hashedPhone] } : {},
            custom_data: {
              currency: "IDR",
              value: Number(order.total_price),
              content_ids: [order.product_id],
              content_type: "product",
            },
          }],
        }),
      });
    } catch (err) {
      console.error("Gagal kirim Meta Conversions API:", err.message);
    }
  }

  // GA4 Measurement Protocol — butuh Measurement ID + API secret (dibuat seller
  // di GA4 Admin > Data Streams > Measurement Protocol API secrets).
  // client_id dibikin dari order id karena request ini gak punya cookie browser asli.
  if (store.ga4_measurement_id && store.ga4_api_secret) {
    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${store.ga4_measurement_id}&api_secret=${store.ga4_api_secret}`,
        {
          method: "POST",
          body: JSON.stringify({
            client_id: `tokku-${order.midtrans_order_id}`,
            events: [{
              name: "purchase",
              params: {
                transaction_id: order.midtrans_order_id,
                currency: "IDR",
                value: Number(order.total_price),
                items: [{ item_id: order.product_id, item_name: order.product_name, quantity: order.quantity }],
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

    // Verifikasi signature biar yakin request ini beneran dari Midtrans, bukan orang iseng
    const expectedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + process.env.MIDTRANS_SERVER_KEY)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      return Response.json({ error: "Invalid signature" }, { status: 403 });
    }

    let newStatus = null;

    if (transaction_status === "capture") {
      newStatus = fraud_status === "accept" ? "paid" : "pending";
    } else if (transaction_status === "settlement") {
      newStatus = "paid";
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      newStatus = "gagal";
    } else if (transaction_status === "pending") {
      newStatus = "pending";
    }

    if (newStatus) {
      const updateData = { status: newStatus };
      if (newStatus === "paid") updateData.paid_at = new Date().toISOString();

      const { data: updatedOrder } = await supabaseAdmin
        .from("orders")
        .update(updateData)
        .eq("midtrans_order_id", order_id)
        .select()
        .maybeSingle();

      // Notifikasi "pembayaran masuk" — ini yang dimaksud notifikasi langsung
      // dari payment gateway, karena webhook Midtrans ini server-to-server,
      // gak lewat browser pembeli sama sekali.
      if (newStatus === "paid" && updatedOrder) {
        await supabaseAdmin.from("notifications").insert({
          store_id: updatedOrder.store_id,
          order_id: updatedOrder.id,
          type: "pembayaran_masuk",
          title: "Pembayaran diterima",
          message: `Pembayaran untuk ${updatedOrder.product_name} sebesar Rp${Number(updatedOrder.total_price).toLocaleString("id-ID")} sudah masuk.`,
        });

        await kirimPush(supabaseAdmin, updatedOrder.store_id, {
          title: "Pembayaran diterima",
          message: `Rp${Number(updatedOrder.total_price).toLocaleString("id-ID")} dari ${updatedOrder.buyer_name} untuk ${updatedOrder.product_name}.`,
          url: "/dashboard/pesanan",
          orderId: updatedOrder.id,
        });

        // Ambil kredensial tracking toko ini, terus kirim event Purchase server-side
        const { data: storeCreds } = await supabaseAdmin
          .from("stores")
          .select("meta_pixel_id, meta_access_token, ga4_measurement_id, ga4_api_secret")
          .eq("id", updatedOrder.store_id)
          .maybeSingle();

        if (storeCreds) {
          await kirimPurchaseServerSide(storeCreds, updatedOrder);
        }
      }
    }

    return Response.json({ message: "OK" });
  } catch (error) {
    console.error("Midtrans notification error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}