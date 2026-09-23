// app/api/cron/insight-mingguan/route.js
//
// Dipanggil otomatis tiap Senin jam 6 pagi oleh Vercel Cron (lihat vercel.json).
// Loop semua toko yang punya minimal 1 produk (toko kosong dilewatin biar gak
// buang-buang pemanggilan API buat toko yang belum ada aktivitas sama sekali),
// generate insight satu-satu. Satu toko gagal (misal Claude API lagi down)
// TIDAK menghentikan proses buat toko lainnya.

import { createClient } from "@supabase/supabase-js";
import { generateInsightMingguan } from "@/lib/insight-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: storeIdsWithProduct } = await supabaseAdmin
    .from("products")
    .select("store_id");

  const uniqueStoreIds = [...new Set((storeIdsWithProduct || []).map((p) => p.store_id))];

  const hasil = { berhasil: 0, gagal: 0, detail: [] };

  for (const storeId of uniqueStoreIds) {
    try {
      await generateInsightMingguan(supabaseAdmin, storeId);
      hasil.berhasil++;
    } catch (err) {
      hasil.gagal++;
      hasil.detail.push({ storeId, error: err.message });
      console.error(`Gagal generate insight buat store ${storeId}:`, err.message);
    }
  }

  return Response.json({ success: true, totalToko: uniqueStoreIds.length, ...hasil });
}
