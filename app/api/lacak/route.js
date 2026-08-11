import { createClient } from "@supabase/supabase-js";

// Server-side karena tabel orders gak punya policy select buat public (cuma
// owner toko). Verifikasi butuh 2 data yang cuma diketahui pembeli: Order ID
// DAN nomor WA yang dipakai pas checkout — biar orang gak bisa asal nebak
// Order ID orang lain terus intip datanya.
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
      return Response.json({ found: false, message: "Isi Order ID dan nomor WA dulu ya." }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, stores(name, slug, accent_color)")
      .eq("midtrans_order_id", orderId.trim().toUpperCase())
      .maybeSingle();

    // Pesan generik kalau gak ketemu ATAU nomor gak cocok — jangan kasih tau
    // mana yang salah, biar gak jadi celah buat nebak-nebak Order ID orang lain.
    if (!order || normalisasiTelepon(order.buyer_phone) !== normalisasiTelepon(buyerPhone)) {
      return Response.json({ found: false, message: "Pesanan gak ketemu. Cek lagi Order ID dan nomor WA-nya." });
    }

    return Response.json({
      found: true,
      order: {
        orderId: order.midtrans_order_id,
        status: order.status,
        productName: order.product_name,
        quantity: order.quantity,
        totalPrice: order.total_price,
        discountCode: order.discount_code,
        discountAmount: order.discount_amount,
        courier: order.courier,
        destinationLabel: order.destination_label,
        fullAddress: order.full_address,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        shippedAt: order.shipped_at,
        completedAt: order.completed_at,
        storeName: order.stores?.name,
        storeSlug: order.stores?.slug,
        accentColor: order.stores?.accent_color || "#D85A30",
      },
    });
  } catch (error) {
    console.error("Lacak pesanan error:", error);
    return Response.json({ found: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}