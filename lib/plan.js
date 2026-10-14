// Satu tempat buat nentuin "toko ini boleh pakai fitur apa". Jangan sebar
// pengecekan plan ke banyak file -- panggil bolehPakaiFitur() / planAktif()
// dari sini aja, biar daftar fitur berbayar gampang diubah dari satu tempat.
//
// Pembagian gratis/berbayar ini hasil diskusi + tokku-paket-fitur.xlsx.
// Harga langganan belum final (masih riset), jadi file ini sengaja gak
// nyimpen harga -- cuma logic "boleh/enggak".

// Batasan buat paket gratis. Produk, kode diskon, dll di atas angka ini
// butuh upgrade. (Enforcement-nya nyusul per fitur -- lihat catatan di
// masing-masing nilai.)
export const BATAS_GRATIS = {
  produkMaks: 30,
  kodeDiskonAktifMaks: 3,
  promoAktifMaks: 1, // promo terjadwal (mulai di masa depan) = berbayar
  laporanHariMaks: 30,
};

// Kunci fitur yang dipakai bolehPakaiFitur(). Samain string ini persis kalau
// dipanggil dari file lain -- typo di sini bikin fiturnya ke-lock/ke-unlock
// diam-diam.
export const FITUR_BERBAYAR = {
  BULK_IMPORT: "bulk_import",
  JAM_EMAS: "jam_emas",
  AI_COPYWRITER_LEBIH: "ai_copywriter_lebih", // kuota gratis dulu abis itu lock
  INSIGHT_AI_HARIAN: "insight_ai_harian", // ringkasan mingguan tetap gratis
  UTM: "utm",
  PIXEL_TRACKING: "pixel_tracking", // Meta CAPI + GA4 server-side
  PROMO_TERJADWAL: "promo_terjadwal", // promo yang promo_starts_at > sekarang
  CART_RECOVERY_WA: "cart_recovery_wa",
  WA_BLAST: "wa_blast",
};

// Toko masih berlangganan aktif? plan_aktif_sampai yang jadi sumber
// kebenaran (bukan cuma kolom plan) -- biar otomatis balik ke gratis begitu
// masa aktifnya lewat, tanpa perlu cron buat nurunin status.
export function planAktif(store) {
  if (!store || store.plan !== "berbayar") return false;
  if (!store.plan_aktif_sampai) return false;
  return new Date(store.plan_aktif_sampai).getTime() > Date.now();
}

// Cek satu fitur berbayar. Fitur yang gak ada di FITUR_BERBAYAR dianggap
// gratis (default terbuka), jadi daftar di atas itu satu-satunya tempat yang
// nentuin fitur mana yang dikunci.
export function bolehPakaiFitur(store, kunciFitur) {
  const daftarBerbayar = Object.values(FITUR_BERBAYAR);
  if (!daftarBerbayar.includes(kunciFitur)) return true;
  return planAktif(store);
}

// Sisa hari langganan, buat ditampilin di dashboard ("Langganan berakhir
// dalam 5 hari"). Null kalau gak lagi berlangganan.
export function sisaHariLangganan(store) {
  if (!planAktif(store)) return null;
  const ms = new Date(store.plan_aktif_sampai).getTime() - Date.now();
  return Math.ceil(ms / (24 * 3600 * 1000));
}
