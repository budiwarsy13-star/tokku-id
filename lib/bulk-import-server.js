// lib/bulk-import-server.js
//
// Helper buat fitur "Import Produk dari CSV". Sengaja dipisah dari route.js
// biar logic validasi & upload gambar bisa dites/dipakai ulang, dan biar
// route.js fokus ke orkestrasi aja.
//
// PRINSIP: server ini SUMBER KEBENARAN validasi — validasi di client (preview
// table) cuma buat UX cepat, bukan satu-satunya penjaga. Baris yang lolos
// preview client tapi gagal di sini akan tetap ditolak per-baris (bukan bikin
// seluruh import gagal), biar seller gak kehilangan baris lain yang valid.

const MAX_TEXT_LENGTH = 200;
const MAX_DESC_LENGTH = 3000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB, samain sama batas upload manual
const IMAGE_FETCH_TIMEOUT_MS = 8000;

// Validasi & normalisasi SATU baris CSV yang udah di-parse jadi object.
// Gak nyentuh network di sini (fetch gambar dipisah ke fungsi lain) supaya
// fungsi ini murni & gampang diuji.
export function validasiBarisProduk(row, rowNumber) {
  const errors = [];

  const name = (row.nama_produk || "").trim();
  if (!name) errors.push("Nama produk kosong.");
  if (name.length > MAX_TEXT_LENGTH) errors.push(`Nama produk kemaksimal ${MAX_TEXT_LENGTH} karakter.`);

  const description = (row.deskripsi || "").trim().slice(0, MAX_DESC_LENGTH);
  const category = (row.kategori || "").trim().slice(0, MAX_TEXT_LENGTH);
  const sku = (row.sku || "").trim().slice(0, 100) || null;

  const weight = parseInt(row.berat_gram, 10);
  const weightFinal = Number.isFinite(weight) && weight > 0 ? weight : 500;

  // Varian: format "Nama:Harga:Stok|Nama2:Harga2:Stok2".
  // Kalau kolom ini diisi, harga & stok produk utama diabaikan (ngikutin
  // pola yang sama kayak form tambah-produk manual: kalau ada varian,
  // price/stock produk induk dihitung dari varian).
  let variants = [];
  const rawVarian = (row.varian || "").trim();
  if (rawVarian) {
    const parts = rawVarian.split("|").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const [vName, vPrice, vStock] = part.split(":").map((s) => (s || "").trim());
      const price = parseInt(vPrice, 10);
      const stock = parseInt(vStock, 10);
      if (!vName || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) {
        errors.push(`Format varian "${part}" salah. Harusnya Nama:Harga:Stok, contoh Merah:50000:10`);
        continue;
      }
      variants.push({ name: vName, sku: null, price, stock });
    }
  }

  let price = 0;
  let stock = 0;
  if (variants.length > 0) {
    price = variants[0].price;
    stock = variants.reduce((sum, v) => sum + v.stock, 0);
  } else {
    price = parseInt(row.harga, 10);
    stock = parseInt(row.stok, 10);
    if (!Number.isFinite(price) || price < 0) errors.push("Harga harus angka >= 0.");
    if (!Number.isFinite(stock) || stock < 0) errors.push("Stok harus angka >= 0.");
  }

  const imageUrls = [row.gambar_1, row.gambar_2, row.gambar_3, row.gambar_4]
    .map((u) => (u || "").trim())
    .filter(Boolean)
    .filter((u) => {
      try {
        const parsed = new URL(u);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    });

  const warnings = [];
  if (imageUrls.length === 0) {
    warnings.push("Gak ada foto — produk tetep diimport, lengkapi foto manual nanti.");
  }

  return {
    rowNumber,
    valid: errors.length === 0,
    errors,
    warnings,
    data: {
      name,
      description,
      category,
      sku,
      weight: weightFinal,
      price: Math.max(0, price || 0),
      stock: Math.max(0, stock || 0),
      variants,
      imageUrls, // masih berupa URL sumber, belum di-upload ulang
    },
  };
}

// Ambil satu gambar dari URL eksternal dan upload ulang ke storage bucket
// tokku.id sendiri (bucket "Produk", sama kayak upload manual). Kenapa
// di-reupload, bukan langsung dipakai URL aslinya:
//  1. Banyak CDN marketplace nge-block hotlink dari domain luar cepat/lambat.
//  2. Kalau produk dihapus/link berubah di marketplace asal, foto toko kita
//     ikut mati padahal itu bukan salah seller.
// Gagal ambil 1 gambar TIDAK menggagalkan seluruh baris — cuma gambar itu
// yang di-skip, biar 1 link mati gak bikin produk gagal total.
export async function unduhDanUploadGambar(supabaseAdmin, storeId, imageUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    const res = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return { success: false, message: `Gagal ambil gambar (HTTP ${res.status}).` };

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return { success: false, message: "URL bukan file gambar." };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return { success: false, message: "Gambar kegedean (maks 5MB)." };
    }

    const ext = (contentType.split("/")[1] || "jpg").split(";")[0];
    const path = `${storeId}/import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("Produk")
      .upload(path, buffer, { contentType });
    if (uploadError) return { success: false, message: uploadError.message };

    const { data } = supabaseAdmin.storage.from("Produk").getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (err) {
    const message = err.name === "AbortError" ? "Timeout ambil gambar." : err.message;
    return { success: false, message };
  }
}
