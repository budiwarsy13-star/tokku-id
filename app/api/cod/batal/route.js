import { createClient } from "@supabase/supabase-js";
import { autentikasiSeller, ambilGrupCod, batalkanCod } from "@/lib/cod-server";
import { cekRateLimit, ambilIp } from "@/lib/rate-limit-server";

// Seller membatalkan order COD (belum dikirim) atau mencatat COD ditolak
// pembeli (paket sudah jalan tapi gak dibayar/dikembalikan). Stok dikembalikan.
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { allowed } = await cekRateLimit(supabaseAdmin, `cod-batal:${ambilIp(request)}`, 30);
    if (!allowed) return Response.json({ success: false, message: "Terlalu banyak percobaan." }, { status: 429 });

    const auth = await autentikasiSeller(supabaseAdmin, request);
    if (auth.error) return auth.error;

    const { orderId } = await request.json();
    if (!orderId) return Response.json({ success: false, message: "Order ID wajib." }, { status: 400 });

    const rows = await ambilGrupCod(supabaseAdmin, String(orderId).trim().toUpperCase());
    if (rows.length === 0 || rows[0].store_id !== auth.store.id) {
      return Response.json({ success: false, message: "Pesanan COD gak ditemukan." }, { status: 404 });
    }
    if (!["cod", "shipped"].includes(rows[0].status)) {
      return Response.json({ success: false, message: "Pesanan ini udah gak bisa dibatalkan." }, { status: 400 });
    }

    const alasan = rows[0].status === "shipped" ? "ditolak pembeli / gagal diantar" : "dibatalkan penjual";
    const hasil = await batalkanCod(supabaseAdmin, rows[0].midtrans_order_id, alasan);
    if (!hasil.updated) return Response.json({ success: false, message: "Pesanan ini sudah diproses sebelumnya." }, { status: 409 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("COD batal error:", error);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
