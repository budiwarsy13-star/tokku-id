// app/api/cron/insight-harian/route.js
//
// Jalan otomatis tiap pagi jam 6 WIB (lihat vercel.json). Sama persis
// strukturnya kayak insight-mingguan, cuma periodType-nya "harian".

import { createClient } from "@supabase/supabase-js";
import { generateInsight } from "@/lib/insight-server";
import { isPro } from "@/lib/plans";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: storeIdsWithProduct } = await supabaseAdmin.from("products").select("store_id");
  const semuaId = [...new Set((storeIdsWithProduct || []).map((p) => p.store_id))];
  // Insight harian = fitur Pro: hanya toko dengan paket aktif.
  const { data: tokoPlan } = await supabaseAdmin.from("stores").select("id, plan, plan_expires_at").in("id", semuaId);
  const uniqueStoreIds = (tokoPlan || []).filter((t) => isPro(t)).map((t) => t.id);

  const hasil = { berhasil: 0, gagal: 0, detail: [] };
  for (const storeId of uniqueStoreIds) {
    try {
      await generateInsight(supabaseAdmin, storeId, "harian");
      hasil.berhasil++;
    } catch (err) {
      hasil.gagal++;
      hasil.detail.push({ storeId, error: err.message });
      console.error(`Gagal generate insight harian buat store ${storeId}:`, err.message);
    }
  }

  return Response.json({ success: true, totalToko: uniqueStoreIds.length, ...hasil });
}
