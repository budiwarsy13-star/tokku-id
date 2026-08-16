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

    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("*, stores(name, slug, accent_color)")
      .eq("midtrans_order_id", orderId.trim().toUpperCase());

    const first = rows?.[0];

    // Pesan generik kalau gak ketemu ATAU nomor gak cocok — jangan kasih tau
    // mana yang salah, biar gak jadi celah buat nebak-nebak Order ID orang lain.
    if (!first || normalisasiTelepon(first.buyer_phone) !== normalisasiTelepon(buyerPhone)) {
      return Response.json({ found: false, message: "Pesanan gak ketemu. Cek lagi Order ID dan nomor WA-nya." });
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