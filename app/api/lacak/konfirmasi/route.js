import { createClient } from "@supabase/supabase-js";
import { kirimPush } from "@/lib/push-server";

// Konfirmasi "pesanan diterima" dari sisi pembeli. Verifikasi ulang Order ID +
// nomor WA (sama kayak /api/lacak) biar cuma pemilik pesanan yang bisa
// nge-trigger ini — bukan asal siapa aja yang nebak Order ID.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalisasiTelepon(nomor) {
  return (nomor || "").replace(/\D/g, "").replace(/^0/, "62").replace(/^62?/, "62");
}

export async function POST(request) {
  try {
    const { orderId, buyerPhone } = await request.json();
    if (!orderId || !buyerPhone) {
      return Response.json({ success: false, message: "Data gak lengkap." }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("midtrans_order_id", orderId.trim().toUpperCase())
      .maybeSingle();

    if (!order || normalisasiTelepon(order.buyer_phone) !== normalisasiTelepon(buyerPhone)) {
      return Response.json({ success: false, message: "Pesanan gak ketemu." }, { status: 404 });
    }

    if (order.status !== "shipped") {
      return Response.json({
        success: false,
        message: "Pesanan ini belum berstatus 'Dikirim', jadi belum bisa dikonfirmasi diterima.",
      }, { status: 400 });
    }

    const completedAt = new Date().toISOString();
    await supabaseAdmin
      .from("orders")
      .update({ status: "selesai", completed_at: completedAt })
      .eq("id", order.id);

    await supabaseAdmin.from("notifications").insert({
      store_id: order.store_id,
      order_id: order.id,
      type: "pesanan_selesai",
      title: "Pesanan selesai",
      message: `${order.buyer_name} sudah konfirmasi pesanan ${order.product_name} diterima.`,
    });

    await kirimPush(supabaseAdmin, order.store_id, {
      title: "Pesanan selesai ✅",
      message: `${order.buyer_name} udah konfirmasi ${order.product_name} diterima.`,
      url: "/dashboard/pesanan",
      orderId: order.id,
    });

    return Response.json({ success: true, completedAt });
  } catch (error) {
    console.error("Konfirmasi diterima error:", error);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
