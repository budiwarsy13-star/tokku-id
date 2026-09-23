// app/api/produk/bulk-import/route.js
//
// Endpoint buat fitur "Import Produk dari CSV". Dipanggil per-batch dari
// app/dashboard/produk/import/page.js (client kirim beberapa baris sekaligus,
// bukan seluruh CSV dalam 1 request — biar gak kena timeout function kalau
// CSV-nya ratusan baris dengan banyak gambar).
//
// CATATAN KEAMANAN — beda dari sebagian endpoint lain yang percaya storeId
// dari body: di sini kita SELALU nurunin storeId dari sesi login yang
// terverifikasi, bukan dari apa yang diklaim client. Ini nyegah seller A
// iseng ngirim storeId milik seller B buat nyuntik produk ke toko orang lain.

import { createClient } from "@supabase/supabase-js";
import { cekRateLimit, ambilIp } from "@/lib/rate-limit-server";
import { validasiBarisProduk, unduhDanUploadGambar } from "@/lib/bulk-import-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_ROWS_PER_REQUEST = 25;

export async function POST(request) {
  try {
    // 1. Verifikasi sesi login dari token yang dikirim client (Authorization:
    //    Bearer <access_token>), BUKAN dari storeId yang diklaim body request.
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return Response.json({ success: false, message: "Belum login." }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return Response.json({ success: false, message: "Sesi login gak valid, coba login ulang." }, { status: 401 });
    }
    const user = userData.user;

    // 2. Toko diambil dari user_id yang login, bukan dari body. Ini yang
    //    nutup celah "import ke toko orang lain".
    const { data: store } = await supabaseAdmin
      .from("stores").select("id").eq("user_id", user.id).maybeSingle();
    if (!store) {
      return Response.json({ success: false, message: "Kamu belum punya toko." }, { status: 404 });
    }

    // 3. Rate limit per-user biar endpoint yang lumayan berat ini (fetch
    //    gambar dari luar per baris) gak bisa disalahgunakan buat spam/DoS.
    const rl = await cekRateLimit(supabaseAdmin, `bulk_import:${user.id}`, 20);
    if (!rl.allowed) {
      return Response.json(
        { success: false, message: "Kebanyakan request import, coba lagi sebentar lagi." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return Response.json({ success: false, message: "Gak ada baris buat diimport." }, { status: 400 });
    }
    if (rows.length > MAX_ROWS_PER_REQUEST) {
      return Response.json(
        { success: false, message: `Maks ${MAX_ROWS_PER_REQUEST} baris per batch. Client seharusnya udah bagi batch — coba refresh & ulangi.` },
        { status: 400 }
      );
    }

    // 4. Proses tiap baris SECARA INDEPENDEN. Satu baris gagal (format salah,
    //    gambar mati, dll) gak boleh nggagalin baris lain di batch yang sama —
    //    seller migrasi ratusan produk, kita gak mau 1 baris jelek bikin
    //    semuanya harus diulang dari nol.
    const hasil = [];
    for (const row of rows) {
      const validasi = validasiBarisProduk(row, row.__rowNumber ?? null);
      if (!validasi.valid) {
        hasil.push({ rowNumber: validasi.rowNumber, success: false, errors: validasi.errors });
        continue;
      }

      // Unduh & re-upload tiap gambar sumber ke storage sendiri. Gagal di 1
      // gambar cuma bikin gambar itu di-skip, bukan gagalin produknya.
      const uploadedImages = [];
      const imageWarnings = [...validasi.warnings];
      for (const url of validasi.data.imageUrls) {
        const uploadResult = await unduhDanUploadGambar(supabaseAdmin, store.id, url);
        if (uploadResult.success) {
          uploadedImages.push(uploadResult.url);
        } else {
          imageWarnings.push(`Gambar "${url}" dilewati: ${uploadResult.message}`);
        }
      }

      const payload = {
        store_id: store.id,
        name: validasi.data.name,
        description: validasi.data.description,
        category: validasi.data.category,
        sku: validasi.data.sku,
        weight: validasi.data.weight,
        price: validasi.data.price,
        stock: validasi.data.stock,
        images: uploadedImages,
        video_url: null,
        variants: validasi.data.variants,
      };

      const { error: insertError } = await supabaseAdmin.from("products").insert(payload);
      if (insertError) {
        hasil.push({ rowNumber: validasi.rowNumber, success: false, errors: [insertError.message] });
        continue;
      }

      hasil.push({
        rowNumber: validasi.rowNumber,
        success: true,
        name: validasi.data.name,
        warnings: imageWarnings,
      });
    }

    return Response.json({ success: true, hasil });
  } catch (error) {
    console.error("Bulk import error:", error);
    return Response.json({ success: false, message: "Terjadi kesalahan di server." }, { status: 500 });
  }
}
