// lib/insight-server.js
import { mintaJSON } from "@/lib/ai-provider";
import { kirimPush } from "@/lib/push-server";
import { buatNotifikasi } from "@/lib/notifications";

const SYSTEM_PROMPT = `Kamu adalah konsultan bisnis e-commerce yang ngasih insight ke seller UMKM Indonesia berdasarkan data toko mereka.

ATURAN:
- Balas HANYA JSON valid, tanpa markdown, tanpa teks lain.
- Insight HARUS berdasarkan angka yang dikasih — jangan mengarang tren yang gak ada di data.
- Kalau datanya terlalu sedikit buat disimpulkan apa-apa (misal toko baru, belum ada order), bilang jujur di insight-nya, jangan dipaksain kesannya banyak temuan.
- Prioritaskan yang ACTIONABLE — seller harus tau apa yang bisa langsung dia lakuin, bukan cuma "penjualan turun".
- Maksimal 5 insight, minimal 1. Bahasa santai tapi jelas, kayak temen yang paham data ngejelasin ke temen lain.

Schema JSON:
{
  "ringkasan_singkat": "1 kalimat pendek buat headline popup, sebutkan angka paling penting (contoh: 'Omzet hari ini Rp450rb dari 12 transaksi, naik 8%')",
  "insights": [
    {
      "judul": "judul singkat, maks 60 karakter",
      "penjelasan": "penjelasan berdasarkan angka yang ada, 1-2 kalimat",
      "aksi_disarankan": "1 saran konkret yang bisa langsung dikerjain"
    }
  ]
}`;

// Ngumpulin data mentah N hari terakhir buat 1 toko. `hariKeBelakang` = 1 buat
// insight harian, 7 buat mingguan — logic ngitungnya sama persis, cuma
// rentang waktunya beda.
export async function ambilStatsPeriode(supabaseAdmin, storeId, hariKeBelakang) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - hariKeBelakang * 24 * 60 * 60 * 1000);

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

// `periodType`: "harian" (hariKeBelakang=1) atau "mingguan" (hariKeBelakang=7)
export async function generateInsight(supabaseAdmin, storeId, periodType = "mingguan") {
  const hariKeBelakang = periodType === "harian" ? 1 : 7;
  const stats = await ambilStatsPeriode(supabaseAdmin, storeId, hariKeBelakang);

  const label = periodType === "harian" ? "24 jam" : "7 hari";
  const text = `Data toko ${label} terakhir (${stats.periodStart} sampai ${stats.periodEnd}):\n${JSON.stringify(stats, null, 2)}\n\nBuatkan insight sesuai schema JSON yang ditentukan.`;

  const hasil = await mintaJSON({ systemPrompt: SYSTEM_PROMPT, text, maxTokens: 1200 });
  const insights = Array.isArray(hasil.insights) ? hasil.insights : [];
  const ringkasanSingkat = hasil.ringkasan_singkat || insights[0]?.judul || "Insight toko kamu udah siap.";

  const { data: inserted, error } = await supabaseAdmin
    .from("ai_insights")
    .insert({
      store_id: storeId,
      period_type: periodType,
      period_start: stats.periodStart,
      period_end: stats.periodEnd,
      stats,
      insights,
      ringkasan_singkat: ringkasanSingkat,
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Gagal simpan insight: ${error.message}`);

  await buatNotifikasi(supabaseAdmin, {
    storeId,
    type: `insight_${periodType}`,
    title: periodType === "harian" ? "Ringkasan harian toko kamu" : "Insight mingguan toko kamu udah siap",
    message: ringkasanSingkat,
  });

  await kirimPush(supabaseAdmin, storeId, {
    title: periodType === "harian" ? "📊 Ringkasan hari ini" : "📊 Insight mingguan siap",
    message: ringkasanSingkat,
    url: "/dashboard/insight",
  });

  return inserted;
}

// Nama lama dipertahanin biar route yang udah ada gak perlu diubah semua.
export async function generateInsightMingguan(supabaseAdmin, storeId) {
  return generateInsight(supabaseAdmin, storeId, "mingguan");
}
