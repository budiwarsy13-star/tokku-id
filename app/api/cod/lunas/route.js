import { createClient } from "@supabase/supabase-js";
import { autentikasiSeller, ambilGrupCod, tandaiCodLunas } from "@/lib/cod-server";
import { cekRateLimit, ambilIp } from "@/lib/rate-limit-server";

// Seller menandai COD sudah dibayar (konfirmasi manual). Ini jalur cadangan
// selama belum ada trigger otomatis dari ekspedisi (lihat /api/cod/settle).
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { allowed } = await cekRateLimit(supabaseAdmin, `cod-lunas:${ambilIp(request)}`, 30);
    if (!allowed) return Response.json({ success: false, message: "Terlalu banyak percobaan." }, { status: 429 });

    const auth = await autentikasiSeller(supabaseAdmin, request);
    if (auth.error) return auth.error;

    const { orderId } = await request.json();
    if (!orderId) return Response.json({ success: false, message: "Order ID wajib." }, { status: 400 });

    const rows = await ambilGrupCod(supabaseAdmin, String(orderId).trim().toUpperCase());
    if (rows.length === 0 || rows[0].store_id !== auth.store.id) {
      return Response.json({ success: false, message: "Pesanan COD gak ditemukan." }, { status: 404 });
    }
    if (rows[0].status !== "shipped") {
      return Response.json({ success: false, message: "COD cuma bisa ditandai lunas setelah pesanan berstatus Dikirim." }, { status: 400 });
    }

    const hasil = await tandaiCodLunas(supabaseAdmin, rows[0].midtrans_order_id, "seller_manual");
    if (!hasil.updated) return Response.json({ success: false, message: "Pesanan ini sudah diproses sebelumnya." }, { status: 409 });
    return Response.json({ success: true, codPaidAt: hasil.rows[0].cod_paid_at, completedAt: hasil.rows[0].completed_at });
  } catch (error) {
    console.error("COD lunas error:", error);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
