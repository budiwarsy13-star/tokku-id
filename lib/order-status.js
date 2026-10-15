// Helper kecil buat bedain order COD vs online. Dipakai dashboard/laporan biar
// order COD yang BELUM dibayar ke kurir gak dihitung sebagai penjualan.
//
// Alur status order COD:  cod  ->  shipped  ->  selesai   (atau gagal kalau batal/ditolak)
// COD cuma metode bayar: statusnya TIDAK PERNAH "paid". "Lunas" dicatat di kolom
// cod_paid_at (diisi webhook ekspedisi atau konfirmasi manual seller).

export const isCod = (o) => o?.payment_method === "cod";

// COD yang uangnya belum diterima (belum dikirim / masih di jalan / ditolak).
export const isCodBelumLunas = (o) => isCod(o) && !o?.cod_paid_at;

// Dihitung sebagai penjualan: semua status KECUALI "pending" (belum dibayar) dan
// "gagal" (dibatalkan / expired), dan COD yang belum lunas (uangnya belum diterima).
export const hitungSebagaiPenjualan = (o) =>
  o.status !== "pending" && o.status !== "gagal" && !isCodBelumLunas(o);
