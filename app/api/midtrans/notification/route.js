import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Pakai service role di sini karena ini request server-to-server dari Midtrans,
// bukan dari browser user, jadi butuh akses penuh buat update tabel orders.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
      }
    }

    return Response.json({ message: "OK" });
  } catch (error) {
    console.error("Midtrans notification error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}