import { createClient } from "@supabase/supabase-js";
import { kirimPush } from "@/lib/push-server";
import { ambilIp, cekRateLimit } from "@/lib/rate-limit-server";
import { autentikasiBuyer } from "@/lib/buyer-auth-server";

// Konfirmasi "pesanan diterima" dari sisi pembeli. Wajib sesi buyer terverifikasi
// (OTP email) dan pesanan harus milik email itu (sama kayak /api/lacak).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { allowed } = await cekRateLimit(supabaseAdmin, `konfirmasi:${ambilIp(request)}`, 10);
    if (!allowed) {
      return Response.json({ success: false, message: "Kebanyakan percobaan. Coba lagi sebentar lagi." }, { status: 429 });
    }

    const auth = await autentikasiBuyer(supabaseAdmin, request);
    if (auth.error) return auth.error;

    const { orderId } = await request.json().catch(() => ({}));
    if (!orderId) {
      return Response.json({ success: false, message: "Data gak lengkap." }, { status: 400 });
    }

    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("midtrans_order_id", String(orderId).trim().toUpperCase())
      .eq("buyer_email", auth.email);

    const first = rows?.[0];
    if (!first) {
      return Response.json({ success: false, message: "Pesanan gak ketemu." }, { status: 404 });
    }

    // COD: pesanan baru selesai setelah pembeli membayar ke kurir (trigger dari
    // ekspedisi / konfirmasi seller), bukan lewat tombol "sudah diterima".
    if (first.payment_method === "cod") {
      return Response.json({
        success: false,
        message: "Pesanan COD otomatis selesai setelah kamu bayar ke kurir saat paket tiba.",
      }, { status: 400 });
    }

    if (first.status !== "shipped") {
      return Response.json({
        success: false,
        message: "Pesanan ini belum berstatus 'Dikirim', jadi belum bisa dikonfirmasi diterima.",
      }, { status: 400 });
    }

    const completedAt = new Date().toISOString();
    await supabaseAdmin
      .from("orders")
      .update({ status: "selesai", completed_at: completedAt })
      .eq("midtrans_order_id", first.midtrans_order_id);

    const ringkasanProduk = rows.length === 1
      ? first.product_name
      : `${first.product_name} + ${rows.length - 1} produk lainnya`;

    await supabaseAdmin.from("notifications").insert({
      store_id: first.store_id,
      order_id: first.id,
      type: "pesanan_selesai",
      title: "Pesanan selesai",
      message: `${first.buyer_name} sudah konfirmasi pesanan ${ringkasanProduk} diterima.`,
    });

    await kirimPush(supabaseAdmin, first.store_id, {
      title: "Pesanan selesai ✅",
      message: `${first.buyer_name} udah konfirmasi ${ringkasanProduk} diterima.`,
      url: "/dashboard/pesanan",
      orderId: first.id,
    });

    return Response.json({ success: true, completedAt });
  } catch (error) {
    console.error("Konfirmasi diterima error:", error);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}