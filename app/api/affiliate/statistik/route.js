import { supabaseAdmin, autentikasiAffiliate } from "@/lib/affiliate-server";
import { ringkasPerChannel, ringkasSaldo } from "@/lib/affiliate-stat";

// Statistik dashboard affiliate: funnel per channel (kunjungan -> klik produk ->
// order), komisi per status, komisi per transaksi, dan riwayat pencairan.
// Cuma data milik affiliate yang login; data pembeli GAK pernah ikut keluar.
export async function GET(request) {
  try {
    const auth = await autentikasiAffiliate(request, { harusAktif: true });
    if (auth.error) return auth.error;
    const { affiliate } = auth;

    const hariParam = parseInt(new URL(request.url).searchParams.get("hari"), 10);
    const hari = [7, 30, 90].includes(hariParam) ? hariParam : 30;
    const sejak = new Date(Date.now() - hari * 86400 * 1000).toISOString();

    // Status komisi diperbarui dulu biar angka yang tampil terkini.
    await supabaseAdmin.rpc("affiliate_sinkron_komisi", { p_affiliate_id: affiliate.id, p_hari_tahan: 3 });

    const { data: channelRows } = await supabaseAdmin.from("affiliate_channels")
      .select("id, platform, handle, ref_code, is_active").eq("affiliate_id", affiliate.id);
    const channels = (channelRows || []).map((c) => ({ id: c.id, platform: c.platform, handle: c.handle, refCode: c.ref_code, aktif: c.is_active }));
    const refs = channels.map((c) => c.refCode);

    const [events, orders, komisiSemua, payouts] = await Promise.all([
      refs.length ? supabaseAdmin.rpc("affiliate_event_counts", { p_refs: refs, p_since: sejak }) : { data: [] },
      refs.length
        ? supabaseAdmin.from("orders").select("midtrans_order_id, status, total_price, shipping_cost, ref_source")
            .in("ref_source", refs).gte("created_at", sejak).limit(5000)
        : { data: [] },
      supabaseAdmin.from("affiliate_commissions")
        .select("id, ref_code, store_id, midtrans_order_id, product_name, quantity, base_amount, percent, amount, status, status_reason, payout_id, created_at")
        .eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }).limit(2000),
      supabaseAdmin.from("affiliate_payouts").select("id, total, jumlah_komisi, status, paid_at, referensi, created_at")
        .eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const semua = komisiSemua.data || [];
    const dalamPeriode = semua.filter((k) => k.created_at >= sejak);

    const perChannel = ringkasPerChannel(channels, events.data, orders.data, dalamPeriode);
    const saldo = ringkasSaldo(semua);

    const total = perChannel.reduce((t, c) => ({
      views: t.views + c.views, klikProduk: t.klikProduk + c.klikProduk, order: t.order + c.order,
      omzet: t.omzet + c.omzet, komisi: t.komisi + c.komisi,
    }), { views: 0, klikProduk: 0, order: 0, omzet: 0, komisi: 0 });
    total.konversi = total.views > 0 ? Math.round((total.order / total.views) * 10000) / 100 : 0;

    // Nama toko buat daftar komisi per transaksi
    const tokoIds = [...new Set(semua.slice(0, 100).map((k) => k.store_id))];
    const { data: toko } = tokoIds.length
      ? await supabaseAdmin.from("stores").select("id, name, slug").in("id", tokoIds)
      : { data: [] };
    const namaToko = Object.fromEntries((toko || []).map((t) => [t.id, t.name]));

    const transaksi = semua.slice(0, 100).map((k) => ({
      id: k.id, tanggal: k.created_at, toko: namaToko[k.store_id] || "-", produk: k.product_name,
      jumlah: k.quantity, dasar: Number(k.base_amount), persen: Number(k.percent), komisi: Number(k.amount),
      status: k.status, alasan: k.status_reason, channel: k.ref_code,
      kodeOrder: String(k.midtrans_order_id).slice(-6), // sebagian saja
      dalamBatch: !!k.payout_id,
    }));

    return Response.json({
      success: true, hari, total, saldo, perChannel, transaksi,
      pencairan: (payouts.data || []).map((p) => ({
        id: p.id, total: Number(p.total), jumlahKomisi: p.jumlah_komisi, status: p.status,
        dibayarPada: p.paid_at, referensi: p.referensi, dibuat: p.created_at,
      })),
    });
  } catch (e) {
    console.error("Affiliate statistik error:", e);
    return Response.json({ success: false, message: "Gagal memuat statistik." }, { status: 500 });
  }
}
