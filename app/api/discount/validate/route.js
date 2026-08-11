import { createClient } from "@supabase/supabase-js";

// Pakai service role karena tabel discount_codes sengaja gak punya policy select
// buat public — validasi HARUS lewat sini, gak boleh query langsung dari browser,
// biar orang gak bisa nebak-nebak/enumerasi kode diskon toko lain.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { code, storeId, subtotal } = await request.json();
    if (!code || !storeId || typeof subtotal !== "number") {
      return Response.json({ valid: false, message: "Data gak lengkap." }, { status: 400 });
    }

    const { data: discount } = await supabaseAdmin
      .from("discount_codes")
      .select("*")
      .eq("store_id", storeId)
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();

    if (!discount) {
      return Response.json({ valid: false, message: "Kode diskon gak ditemukan." });
    }
    if (!discount.is_active) {
      return Response.json({ valid: false, message: "Kode diskon udah gak aktif." });
    }
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return Response.json({ valid: false, message: "Kode diskon udah kedaluwarsa." });
    }
    if (discount.usage_limit !== null && discount.used_count >= discount.usage_limit) {
      return Response.json({ valid: false, message: "Kode diskon udah mencapai batas pemakaian." });
    }
    if (subtotal < discount.min_purchase) {
      return Response.json({
        valid: false,
        message: `Minimal belanja Rp${Number(discount.min_purchase).toLocaleString("id-ID")} buat pakai kode ini.`,
      });
    }

    let discountAmount = discount.type === "percentage"
      ? Math.round((subtotal * discount.value) / 100)
      : discount.value;
    // Diskon gak boleh lebih besar dari subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    return Response.json({
      valid: true,
      code: discount.code,
      discountAmount,
      message: discount.type === "percentage"
        ? `Diskon ${discount.value}% berhasil dipakai!`
        : `Diskon Rp${Number(discount.value).toLocaleString("id-ID")} berhasil dipakai!`,
    });
  } catch (error) {
    console.error("Discount validate error:", error);
    return Response.json({ valid: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}