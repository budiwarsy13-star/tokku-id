import { createClient } from "@supabase/supabase-js";
import { ambilIp, cekRateLimit } from "@/lib/rate-limit-server";
import { autentikasiBuyer } from "@/lib/buyer-auth-server";

// Server-side karena tabel orders gak punya policy select buat public (cuma
// owner toko). Akses WAJIB bawa sesi buyer hasil verifikasi OTP email
// (Authorization: Bearer ...) dan pesanan harus milik email itu. Order ID + no WA
// doang GAK CUKUP: dua-duanya bukan rahasia.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Maks 10 percobaan per menit per IP — cukup longgar buat orang yang
    // beneran salah ketik, tapi nutup celah brute-force nebak Order ID orang lain.
    const { allowed } = await cekRateLimit(supabaseAdmin, `lacak:${ambilIp(request)}`, 10);
    if (!allowed) {
      return Response.json({ found: false, message: "Kebanyakan percobaan. Coba lagi sebentar lagi." }, { status: 429 });
    }

    const auth = await autentikasiBuyer(supabaseAdmin, request);
    if (auth.error) return auth.error;

    const { orderId } = await request.json().catch(() => ({}));
    if (!orderId) {
      return Response.json({ found: false, message: "Isi Order ID dulu ya." }, { status: 400 });
    }

    // Filter buyer_email = email sesi: pesanan orang lain gak akan pernah ketemu.
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("*, stores(name, slug, accent_color)")
      .eq("midtrans_order_id", String(orderId).trim().toUpperCase())
      .eq("buyer_email", auth.email);

    const first = rows?.[0];
    if (!first) {
      return Response.json({ found: false, message: "Pesanan gak ketemu di email yang terverifikasi ini. Cek lagi Order ID-nya." });
    }

    // Field yang sama buat semua produk dalam 1 transaksi (status, kurir, resi,
    // dll disimpan di tiap baris tapi nilainya identik karena di-update bareng)
    // hanya diambil dari baris pertama. total_price per baris dijumlah jadi total transaksi.
    const totalTransaksi = rows.reduce((sum, r) => sum + Number(r.total_price), 0);
    const totalDiskon = rows.reduce((sum, r) => sum + Number(r.discount_amount || 0), 0);

    return Response.json({
      found: true,
      order: {
        orderId: first.midtrans_order_id,
        status: first.status,
        items: rows.map((r) => ({ productName: r.product_name, quantity: r.quantity })),
        totalPrice: totalTransaksi,
        discountCode: first.discount_code,
        discountAmount: totalDiskon,
        courier: first.courier,
        waybillNumber: first.waybill_number,
        destinationLabel: first.destination_label,
        fullAddress: first.full_address,
        createdAt: first.created_at,
        paidAt: first.paid_at,
        paymentMethod: first.payment_method || "online",
        codPaidAt: first.cod_paid_at,
        shippedAt: first.shipped_at,
        completedAt: first.completed_at,
        storeName: first.stores?.name,
        storeSlug: first.stores?.slug,
        accentColor: first.stores?.accent_color || "#D85A30",
      },
    });
  } catch (error) {
    console.error("Lacak pesanan error:", error);
    return Response.json({ found: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}