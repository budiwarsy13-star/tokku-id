// Logika harga promo — dipakai di SERVER (checkout, sumber kebenaran harga)
// dan di CLIENT (tampilan toko). Satu rumus biar angka di layar = angka yang ditagih.
//
// Promo = diskon persen per produk dalam rentang waktu. Berlaku untuk harga dasar
// dan semua varian. promo_ends_at WAJIB ada — promo tanpa akhir dianggap tidak aktif
// (cegah promo "nyangkut" selamanya karena lupa dimatikan).

// Selisih jam server vs jam HP pembeli (ms). Di server selalu 0. Di browser diisi
// sekali pas halaman toko kebuka (lihat /api/waktu) supaya countdown & status promo
// gak meleset kalau jam HP pembeli salah beberapa menit.
let offsetWaktuMs = 0;
export function setOffsetWaktu(ms) {
  offsetWaktuMs = Number.isFinite(ms) ? ms : 0;
}
export function sekarang() {
  return Date.now() + offsetWaktuMs;
}

export function promoAktif(product, now = sekarang()) {
  const pct = Number(product?.promo_percent);
  if (!pct || pct < 1 || pct > 95) return false;
  if (!product?.promo_ends_at) return false;
  const akhir = new Date(product.promo_ends_at).getTime();
  const mulai = product.promo_starts_at ? new Date(product.promo_starts_at).getTime() : 0;
  if (Number.isNaN(akhir)) return false;
  return now >= mulai && now < akhir;
}

// Harga setelah promo, dibulatkan ke Rp100 terdekat (49.900 -20% = 39.900, bukan 39.920).
export function hargaPromo(harga, product, now = sekarang()) {
  const asli = Number(harga) || 0;
  if (!promoAktif(product, now)) return asli;
  const diskon = asli * (1 - Number(product.promo_percent) / 100);
  const bulat = Math.round(diskon / 100) * 100;
  return Math.max(0, Math.min(bulat, asli));
}

// Status buat halaman seller: aktif / terjadwal / berakhir / tidak ada
export function statusPromo(product, now = sekarang()) {
  if (!product?.promo_percent || !product?.promo_ends_at) return "tidak_ada";
  if (promoAktif(product, now)) return "aktif";
  const mulai = product.promo_starts_at ? new Date(product.promo_starts_at).getTime() : 0;
  if (now < mulai) return "terjadwal";
  return "berakhir";
}