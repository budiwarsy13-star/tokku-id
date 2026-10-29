// Peta izin admin tokku.id. Prinsip: hak sesedikit mungkin per peran + PEMISAHAN TUGAS:
//  - yang memutus komplain/retur (support) BUKAN yang mencairkan dana (finance),
//  - yang mencairkan dana (finance) TIDAK bisa mengubah paket/menangguhkan toko,
//  - hanya owner yang memegang semua izin (mengubah paket, tangguhkan, verifikasi, baca audit).
export const PERAN = ["owner", "finance", "support"];

const IZIN = {
  owner: ["*"],
  finance: [
    "ringkasan.baca", "seller.baca", "langganan.baca", "langganan.sinkron",
    "keuangan.baca", "keuangan.tulis", "komplain.baca", "pii.tampilkan",
  ],
  support: [
    "ringkasan.baca", "seller.baca", "komplain.baca", "komplain.tulis", "pii.tampilkan",
  ],
};

export function punya(peran, izin) {
  const daftar = IZIN[peran];
  if (!daftar) return false;
  if (izin === null || izin === undefined) return true; // endpoint yang hanya butuh "admin sah"
  return daftar.includes("*") || daftar.includes(izin);
}

// Untuk menyembunyikan menu yang memang tidak boleh diakses peran itu (UI saja; server tetap memeriksa).
export function izinPeran(peran) {
  return IZIN[peran] || [];
}
