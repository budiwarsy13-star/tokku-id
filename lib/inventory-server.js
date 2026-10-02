// lib/inventory-server.js
export async function catatLogStok(supabaseAdmin, {
  storeId, productId, productName, variantName, tipe, perubahan, stokSebelum, stokSesudah, catatan,
}) {
  // Sengaja gak nge-throw kalau gagal — nyatet log itu "nice to have", JANGAN
  // sampai gagal nyatet log bikin keseluruhan transaksi checkout ikut gagal.
  try {
    await supabaseAdmin.from("stock_logs").insert({
      store_id: storeId,
      product_id: productId,
      product_name: productName || null,
      variant_name: variantName || null,
      tipe,
      perubahan,
      stok_sebelum: stokSebelum,
      stok_sesudah: stokSesudah,
      catatan: catatan || null,
    });
  } catch (err) {
    console.error("Gagal catat log stok (diabaikan, gak critical):", err.message);
  }
}
