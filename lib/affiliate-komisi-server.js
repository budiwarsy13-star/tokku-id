// Atribusi & hitung komisi affiliate. Server-only (service role).
import { normalisasiTelepon } from "@/lib/wa-server";
import { bolehPakaiFitur, FITUR_BERBAYAR } from "@/lib/plan";

// Hitung komisi per baris order. Dasar komisi = nilai BARANG setelah diskon
// (ongkir TIDAK ikut dihitung). Diskon kode dibagi proporsional ke tiap baris,
// karena di tabel orders diskon & ongkir cuma ditaruh di baris pertama.
//
// rows:    [{ id, product_id, product_name, quantity, total_price, shipping_cost, discount_amount }]
// persen:  { [product_id]: number }  (persen komisi per produk, null/0 = gak ikut)
// Balikin: [{ order_id, product_id, product_name, quantity, base_amount, percent, amount }]
export function hitungKomisiOrder(rows, persen) {
  const gross = rows.map((r) => Math.max(Number(r.total_price || 0) - Number(r.shipping_cost || 0) + Number(r.discount_amount || 0), 0));
  const totalGross = gross.reduce((s, g) => s + g, 0);
  const totalDiskon = rows.reduce((s, r) => s + Number(r.discount_amount || 0), 0);

  const hasil = [];
  rows.forEach((r, i) => {
    const pct = Number(persen[r.product_id] || 0);
    if (!(pct > 0)) return;
    const potongan = totalGross > 0 ? Math.round((totalDiskon * gross[i]) / totalGross) : 0;
    const base = Math.max(gross[i] - potongan, 0);
    const amount = Math.floor((base * pct) / 100);
    if (amount < 1) return;
    hasil.push({
      order_id: r.id, product_id: r.product_id, product_name: r.product_name,
      quantity: r.quantity || 1, base_amount: base, percent: pct, amount,
    });
  });
  return hasil;
}

// Dipanggil dari /api/checkout setelah baris order tersimpan. BEST-EFFORT:
// gagal di sini gak boleh menggagalkan checkout (pembeli tetap bisa order).
//
// Aturan atribusi:
//  - ref harus cocok persis dengan kode channel affiliate yang AKTIF
//  - affiliate harus berstatus aktif
//  - self-referral dicegah: nomor WA pembeli = nomor affiliate / nomor WA toko -> tanpa komisi
//  - persen komisi di-snapshot saat order dibuat (ubah persen nanti gak berpengaruh)
export async function catatKomisiAffiliate(supabaseAdmin, { storeId, midtransOrderId, refSource, buyerPhone }) {
  if (!refSource) return { dibuat: 0, alasan: "tanpa_ref" };

  const { data: channel } = await supabaseAdmin.from("affiliate_channels")
    .select("id, affiliate_id, ref_code").eq("ref_code", refSource).eq("is_active", true).maybeSingle();
  if (!channel) return { dibuat: 0, alasan: "bukan_kode_affiliate" };

  const { data: affiliate } = await supabaseAdmin.from("affiliates")
    .select("id, phone, status").eq("id", channel.affiliate_id).maybeSingle();
  if (!affiliate || affiliate.status !== "aktif") return { dibuat: 0, alasan: "affiliate_tidak_aktif" };

  const telPembeli = normalisasiTelepon(buyerPhone);
  const { data: toko } = await supabaseAdmin.from("stores").select("wa_number, plan, plan_aktif_sampai").eq("id", storeId).maybeSingle();
  // Affiliate = fitur berbayar. Toko yang langganannya lewat tidak menghasilkan komisi baru.
  if (!toko || !bolehPakaiFitur(toko, FITUR_BERBAYAR.AFFILIATE)) return { dibuat: 0, alasan: "toko_tidak_berlangganan" };
  const telToko = toko?.wa_number ? normalisasiTelepon(toko.wa_number) : null;
  if (telPembeli && (telPembeli === affiliate.phone || (telToko && telToko === affiliate.phone))) {
    return { dibuat: 0, alasan: "self_referral" };
  }

  const { data: rows } = await supabaseAdmin.from("orders")
    .select("id, product_id, product_name, quantity, total_price, shipping_cost, discount_amount")
    .eq("midtrans_order_id", midtransOrderId).eq("store_id", storeId);
  if (!rows || rows.length === 0) return { dibuat: 0, alasan: "order_tidak_ada" };

  const ids = [...new Set(rows.map((r) => r.product_id).filter(Boolean))];
  const { data: produk } = await supabaseAdmin.from("products")
    .select("id, affiliate_commission_percent").in("id", ids);
  const persen = Object.fromEntries((produk || []).map((p) => [p.id, p.affiliate_commission_percent]));

  const komisi = hitungKomisiOrder(rows, persen);
  if (komisi.length === 0) return { dibuat: 0, alasan: "produk_tanpa_komisi" };

  const { error } = await supabaseAdmin.from("affiliate_commissions").upsert(
    komisi.map((k) => ({
      ...k, affiliate_id: affiliate.id, channel_id: channel.id, ref_code: channel.ref_code,
      store_id: storeId, midtrans_order_id: midtransOrderId,
    })),
    { onConflict: "order_id", ignoreDuplicates: true }
  );
  if (error) throw new Error("Gagal simpan komisi affiliate: " + error.message);
  return { dibuat: komisi.length };
}
