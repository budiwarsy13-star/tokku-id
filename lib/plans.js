// SATU-SATUNYA tempat definisi paket. Ubah angka di sini -> semua halaman & server ikut berubah.
// (Batas yang sama juga ditegakkan di database: lihat 11-paket-langganan.sql — kalau angka
// di bawah diubah, ubah juga angka di trigger SQL-nya.)
//
// Model: 'free' (default) dan 'pro'. Pro = plan 'pro' DAN plan_expires_at masih di masa depan,
// jadi paket yang kedaluwarsa otomatis kembali ke Gratis tanpa perlu cron.

export const HARGA = {
  bulanan: 249000,
  tahunan: 2490000, // bayar 10 bulan, dapat 12 (hemat 2 bulan)
};
export const AKTIFKAN_TAHUNAN = true;

export const PERIODE = {
  bulanan: { bulan: 1, label: "1 bulan" },
  tahunan: { bulan: 12, label: "12 bulan" },
};

export const BATAS_FREE = {
  produk: 30,
  produkPromoAktif: 1,
  kodeDiskonAktif: 3,
  aiCopywritingPerBulan: 5,
  notifWaSellerPerBulan: 30,
  laporanHari: 30,
};

// Fitur yang HANYA untuk Pro. Fitur yang tidak ada di sini = gratis.
const FITUR_PRO = new Set([
  "pixel_capi", "utm", "jam_emas", "cart_recovery", "wa_blast",
  "bulk_import", "tema_kustom", "insight_harian", "promo_terjadwal", "laporan_90_hari",
]);

export const NAMA_FITUR = {
  pixel_capi: "Meta Pixel / GA4 + server-side tracking",
  utm: "Pesanan per sumber (UTM)",
  jam_emas: "Jam emas jualan",
  cart_recovery: "Cart Recovery WhatsApp",
  wa_blast: "WA Blast ke pembeli lama",
  bulk_import: "Import produk dari CSV",
  tema_kustom: "Kustomisasi tampilan penuh",
  insight_harian: "Insight AI harian",
  promo_terjadwal: "Promo terjadwal & tanpa batas",
  laporan_90_hari: "Laporan 90 hari",
};

// Untuk tabel perbandingan di halaman Langganan
export const PERBANDINGAN = [
  { fitur: "Toko, checkout, ongkir otomatis, pesanan, lacak pesanan", gratis: "✓", pro: "✓" },
  { fitur: "Jumlah produk", gratis: `${BATAS_FREE.produk}`, pro: "Tanpa batas" },
  { fitur: "Kode diskon aktif", gratis: `${BATAS_FREE.kodeDiskonAktif}`, pro: "Tanpa batas" },
  { fitur: "Promo & Flash Sale", gratis: `${BATAS_FREE.produkPromoAktif} produk`, pro: "Tanpa batas + terjadwal" },
  { fitur: "Laporan penjualan", gratis: `${BATAS_FREE.laporanHari} hari`, pro: "Sampai 90 hari" },
  { fitur: "AI copywriter", gratis: `${BATAS_FREE.aiCopywritingPerBulan}x / bulan`, pro: "Lebih banyak" },
  { fitur: "Notifikasi WA ke seller", gratis: `${BATAS_FREE.notifWaSellerPerBulan} / bulan`, pro: "Tanpa batas" },
  { fitur: "Insight AI", gratis: "Mingguan", pro: "Harian + mingguan" },
  { fitur: "Tampilan toko", gratis: "Layout & warna", pro: "Kustom penuh" },
  { fitur: "Meta Pixel / GA4 + server-side", gratis: "—", pro: "✓" },
  { fitur: "Pesanan per sumber (UTM)", gratis: "—", pro: "✓" },
  { fitur: "Jam emas jualan", gratis: "—", pro: "✓" },
  { fitur: "Cart Recovery WhatsApp", gratis: "—", pro: "✓" },
  { fitur: "WA Blast", gratis: "—", pro: "✓" },
  { fitur: "Import produk CSV", gratis: "—", pro: "✓" },
];

export function isPro(store, now = Date.now()) {
  if (!store || store.plan !== "pro" || !store.plan_expires_at) return false;
  return new Date(store.plan_expires_at).getTime() > now;
}
export function bisa(store, fitur, now = Date.now()) {
  return !FITUR_PRO.has(fitur) || isPro(store, now);
}
// Batas numerik untuk paket toko ini (Infinity kalau Pro).
export function batas(store, kunci, now = Date.now()) {
  return isPro(store, now) ? Infinity : BATAS_FREE[kunci];
}
export function sisaHariPro(store, now = Date.now()) {
  if (!isPro(store, now)) return 0;
  return Math.ceil((new Date(store.plan_expires_at).getTime() - now) / 86400000);
}
export function rupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}
