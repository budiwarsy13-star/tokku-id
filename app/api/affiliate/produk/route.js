import { supabaseAdmin, autentikasiAffiliate } from "@/lib/affiliate-server";
import { bolehPakaiFitur, FITUR_BERBAYAR } from "@/lib/plan";

// Etalase produk yang bisa dipromosikan: produk dari semua toko yang komisi
// affiliate-nya dihidupkan seller. Cuma info publik (nama, harga, foto) + persen komisi.
export async function GET(request) {
  try {
    const auth = await autentikasiAffiliate(request, { harusAktif: true });
    if (auth.error) return auth.error;

    const q = String(new URL(request.url).searchParams.get("q") || "").trim().slice(0, 60).replace(/[%,()]/g, " ");
    let query = supabaseAdmin.from("products")
      .select("id, name, price, images, affiliate_commission_percent, store_id")
      .not("affiliate_commission_percent", "is", null)
      .order("affiliate_commission_percent", { ascending: false }).limit(60);
    if (q) query = query.ilike("name", `%${q}%`);
    const { data: produk } = await query;

    const ids = [...new Set((produk || []).map((p) => p.store_id))];
    const { data: toko } = ids.length
      ? await supabaseAdmin.from("stores").select("id, name, slug, is_verified, total_success_orders, plan, plan_aktif_sampai").in("id", ids)
      : { data: [] };
    // Hanya toko dengan langganan aktif yang tampil di etalase (affiliate = fitur berbayar).
    const tokoById = Object.fromEntries((toko || []).filter((t) => bolehPakaiFitur(t, FITUR_BERBAYAR.AFFILIATE)).map((t) => [t.id, t]));

    return Response.json({
      success: true,
      produk: (produk || []).filter((p) => tokoById[p.store_id]).map((p) => {
        const t = tokoById[p.store_id];
        const persen = Number(p.affiliate_commission_percent);
        return {
          id: p.id, nama: p.name, harga: Number(p.price), foto: (p.images || [])[0] || null,
          persen, komisiPerUnit: Math.floor((Number(p.price) * persen) / 100),
          toko: { nama: t.name, slug: t.slug, verified: !!t.is_verified, pesananSukses: t.total_success_orders || 0 },
        };
      }),
    });
  } catch (e) {
    console.error("Affiliate produk error:", e);
    return Response.json({ success: false, message: "Gagal memuat produk." }, { status: 500 });
  }
}
