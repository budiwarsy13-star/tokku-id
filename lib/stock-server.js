// Helper buat kurangi/kembaliin stok secara ATOMIC — pakai optimistic
// concurrency (baca nilai lama, update dengan syarat nilai itu belum berubah)
// biar 2 buyer yang checkout bersamaan gak bisa dua-duanya lolos beli stok
// terakhir yang sama (overselling).

// Produk TANPA varian: kurangi kolom `stock` langsung.
// Produk DENGAN varian: cari elemen di array `variants` (JSON) yang namanya
// cocok, kurangi `stock` di situ aja, simpan ulang seluruh array.
export async function kurangiStokAtomic(supabaseAdmin, productId, variantName, qty) {
  const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", productId).maybeSingle();
  if (!product) return { success: false, message: "Produk gak ditemukan." };

  if (variantName) {
    const variants = product.variants || [];
    const idx = variants.findIndex((v) => v.name === variantName);
    if (idx === -1) return { success: false, message: `Varian "${variantName}" gak ditemukan.` };
    if (variants[idx].stock < qty) {
      return { success: false, message: `Stok "${product.name} - ${variantName}" cuma tersisa ${variants[idx].stock}.` };
    }
    const variantsBaru = variants.map((v, i) => (i === idx ? { ...v, stock: v.stock - qty } : v));

    // Guard optimistic: update cuma sukses kalau `variants` masih persis sama
    // kayak yang baru dibaca — kalau ada checkout lain yang keduluan ubah
    // stok di antara baca & tulis ini, update ini gagal (0 baris ke-update).
    const { data: updated } = await supabaseAdmin
      .from("products")
      .update({ variants: variantsBaru })
      .eq("id", productId)
      .eq("variants", JSON.stringify(variants))
      .select();

    if (!updated || updated.length === 0) {
      return { success: false, message: "Stok baru aja berubah (ada pembeli lain). Coba checkout ulang." };
    }
    return { success: true };
  } else {
    if (product.stock < qty) {
      return { success: false, message: `Stok "${product.name}" cuma tersisa ${product.stock}.` };
    }
    const { data: updated } = await supabaseAdmin
      .from("products")
      .update({ stock: product.stock - qty })
      .eq("id", productId)
      .eq("stock", product.stock)
      .select();

    if (!updated || updated.length === 0) {
      return { success: false, message: "Stok baru aja berubah (ada pembeli lain). Coba checkout ulang." };
    }
    return { success: true };
  }
}

// Dipanggil pas order berakhir gagal/batal/expired — kembaliin stok yang
// sempat "direservasi" pas order dibuat.
export async function kembalikanStok(supabaseAdmin, productId, variantName, qty) {
  const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", productId).maybeSingle();
  if (!product) return;

  if (variantName) {
    const variants = product.variants || [];
    const idx = variants.findIndex((v) => v.name === variantName);
    if (idx === -1) return;
    const variantsBaru = variants.map((v, i) => (i === idx ? { ...v, stock: v.stock + qty } : v));
    await supabaseAdmin.from("products").update({ variants: variantsBaru }).eq("id", productId);
  } else {
    await supabaseAdmin.from("products").update({ stock: product.stock + qty }).eq("id", productId);
  }
}
