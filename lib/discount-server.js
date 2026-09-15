// Helper validasi diskon — dipakai bareng oleh /api/discount/validate (buat cek
// pas buyer ngetik kode) DAN /api/checkout (buat validasi final pas submit).
// Sengaja dipisah biar logicnya cuma ada 1 tempat — gak ada celah beda hasil
// antara "kelihatan valid pas diketik" vs "beneran diterapkan pas checkout".
export async function validasiDiskon(supabaseAdmin, storeId, code, subtotal) {
  if (!code) return { valid: true, discountAmount: 0, code: null };

  const { data: discount } = await supabaseAdmin
    .from("discount_codes")
    .select("*")
    .eq("store_id", storeId)
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (!discount) return { valid: false, message: "Kode diskon gak ditemukan." };
  if (!discount.is_active) return { valid: false, message: "Kode diskon udah gak aktif." };
  if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
    return { valid: false, message: "Kode diskon udah kedaluwarsa." };
  }
  if (discount.usage_limit !== null && discount.used_count >= discount.usage_limit) {
    return { valid: false, message: "Kode diskon udah mencapai batas pemakaian." };
  }
  if (subtotal < discount.min_purchase) {
    return {
      valid: false,
      message: `Minimal belanja Rp${Number(discount.min_purchase).toLocaleString("id-ID")} buat pakai kode ini.`,
    };
  }

  let discountAmount = discount.type === "percentage"
    ? Math.round((subtotal * discount.value) / 100)
    : discount.value;
  discountAmount = Math.min(discountAmount, subtotal);

  return {
    valid: true,
    code: discount.code,
    discountAmount,
    message: discount.type === "percentage"
      ? `Diskon ${discount.value}% berhasil dipakai!`
      : `Diskon Rp${Number(discount.value).toLocaleString("id-ID")} berhasil dipakai!`,
  };
}
