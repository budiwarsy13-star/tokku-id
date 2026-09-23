// lib/insight-server.js
import { mintaJSON } from "@/lib/ai-provider";
import { kirimPush } from "@/lib/push-server";
import { buatNotifikasi } from "@/lib/notifications";

const SYSTEM_PROMPT = `Kamu adalah konsultan bisnis e-commerce yang ngasih insight mingguan ke seller UMKM Indonesia berdasarkan data toko mereka.

ATURAN:
- Balas HANYA JSON valid, tanpa markdown, tanpa teks lain.
- Insight HARUS berdasarkan angka yang dikasih — jangan mengarang tren yang gak ada di data.
- Kalau datanya terlalu sedikit buat disimpulkan apa-apa (misal toko baru, belum ada order), bilang jujur di insight-nya, jangan dipaksain kesannya banyak temuan.
- Prioritaskan yang ACTIONABLE — seller harus tau apa yang bisa langsung dia lakuin, bukan cuma "penjualan turun".
- Maksimal 5 insight, minimal 1. Bahasa santai tapi jelas, kayak temen yang paham data ngejelasin ke temen lain.

Schema JSON:
{
  "insights": [
    {
      "judul": "judul singkat, maks 60 karakter",
      "penjelasan": "penjelasan berdasarkan angka yang ada, 1-2 kalimat",
      "aksi_disarankan": "1 saran konkret yang bisa langsung dikerjain minggu ini"
    }
  ]
}`;

// Ngumpulin data mentah 7 hari terakhir buat 1 toko. Dipisah dari
// generateInsightMingguan biar gampang dites/dilihat independen dari
// panggilan ke Claude.
export async function ambilStatsMingguan(supabaseAdmin, storeId) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("status, total_price, product_name, quantity, shipping_cost, created_at")
    .eq("store_id", storeId)
    .gte("created_at", periodStart.toISOString());

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("name, stock, variants")
    .eq("store_id", storeId);

  const rows = orders || [];
  const paidRows = rows.filter((o) => o.status === "paid" || o.status === "selesai");
  const pendingRows = rows.filter((o) => o.status === "pending");
  const gagalRows = rows.filter((o) => o.status === "gagal");

  const totalRevenue = paidRows.reduce((sum, o) => sum + Number(o.total_price || 0), 0);

  const penjualanPerProduk = {};
  for (const o of paidRows) {
    penjualanPerProduk[o.product_name] = (penjualanPerProduk[o.product_name] || 0) + (o.quantity || 0);
  }
  const topProduk = Object.entries(penjualanPerProduk)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  const stokMenipis = (products || [])
    .filter((p) => {
      const totalStok = (p.variants || []).length > 0
        ? p.variants.reduce((s, v) => s + (v.stock || 0), 0)
        : p.stock;
      return totalStok <= 3;
    })
    .map((p) => p.name)
    .slice(0, 10);

  const totalCheckoutDimulai = paidRows.length + pendingRows.length + gagalRows.length;
  const tingkatBerhasil = totalCheckoutDimulai > 0
    ? Math.round((paidRows.length / totalCheckoutDimulai) * 100)
    : null;

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalOrderMasuk: rows.length,
    totalOrderDibayar: paidRows.length,
    totalOrderGagalDibatalkan: gagalRows.length,
    totalPendapatan: totalRevenue,
    tingkatCheckoutBerhasilPersen: tingkatBerhasil,
    topProdukTerlaris: topProduk,
    produkStokMenipis: stokMenipis,
    jumlahProdukAktif: (products || []).length,
  };
}

export async function generateInsightMingguan(supabaseAdmin, storeId) {
  const stats = await ambilStatsMingguan(supabaseAdmin, storeId);

  const text = `Data toko 7 hari terakhir (${stats.periodStart} sampai ${stats.periodEnd}):\n${JSON.stringify(stats, null, 2)}\n\nBuatkan insight sesuai schema JSON yang ditentukan.`;

  const hasil = await mintaJSON({ systemPrompt: SYSTEM_PROMPT, text, maxTokens: 1200 });
  const insights = Array.isArray(hasil.insights) ? hasil.insights : [];

  const { data: inserted, error } = await supabaseAdmin
    .from("ai_insights")
    .insert({
      store_id: storeId,
      period_start: stats.periodStart,
      period_end: stats.periodEnd,
      stats,
      insights,
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Gagal simpan insight: ${error.message}`);

  await buatNotifikasi(supabaseAdmin, {
    storeId,
    type: "insight_mingguan",
    title: "Insight mingguan toko kamu udah siap",
    message: insights[0]?.judul || "Cek dashboard buat lihat insight minggu ini.",
  });

  await kirimPush(supabaseAdmin, storeId, {
    title: "📊 Insight mingguan siap",
    message: insights[0]?.judul || "Cek insight minggu ini di dashboard.",
    url: "/dashboard/insight",
  });

  return inserted;
}
