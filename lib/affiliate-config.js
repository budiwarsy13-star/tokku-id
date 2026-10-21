// Konfigurasi affiliate yang AMAN dipakai di client maupun server (tanpa import
// server-only). Dipakai form pendaftaran (UI) dan validasi API biar daftar
// pilihannya selalu sama.

export const TERMS_VERSION = "2026-10-v1";
export const MAX_CHANNELS = 10;
export const UMUR_MINIMAL = 17;

// short = potongan nama platform di ref_code (mis. "budi-tt"). Dipakai buat
// ngenalin channel asal order lewat ?ref= di link toko.
export const PLATFORMS = [
  { key: "tiktok",    label: "TikTok",    short: "tt",   placeholder: "@username",          perluUrl: false },
  { key: "instagram", label: "Instagram", short: "ig",   placeholder: "@username",          perluUrl: false },
  { key: "youtube",   label: "YouTube",   short: "yt",   placeholder: "Nama channel",       perluUrl: false },
  { key: "facebook",  label: "Facebook",  short: "fb",   placeholder: "Nama halaman/grup",  perluUrl: false },
  { key: "whatsapp",  label: "WhatsApp (channel/grup)", short: "wa", placeholder: "Nama channel/grup", perluUrl: false },
  { key: "telegram",  label: "Telegram",  short: "tg",   placeholder: "@username",          perluUrl: false },
  { key: "website",   label: "Website / Blog", short: "web", placeholder: "Nama situs",     perluUrl: true },
  { key: "lainnya",   label: "Lainnya",   short: "lain", placeholder: "Nama akun/komunitas", perluUrl: false },
];
export const PLATFORM_KEYS = PLATFORMS.map((p) => p.key);
export const platformByKey = (k) => PLATFORMS.find((p) => p.key === k);

export const NICHES = [
  "Fashion", "Kecantikan", "Skincare", "Makanan & Minuman", "Gadget & Elektronik",
  "Rumah Tangga", "Ibu & Anak", "Olahraga", "Otomotif", "Hobi & Kreatif",
  "Kesehatan", "Edukasi", "Lifestyle", "Lainnya",
];

export const PAYOUT_PROVIDERS = {
  bank: ["BCA", "Mandiri", "BRI", "BNI", "BSI", "CIMB Niaga", "Permata", "BTN", "Danamon", "Jago", "SeaBank", "OCBC", "Jenius (BTPN)"],
  ewallet: ["GoPay", "OVO", "DANA", "ShopeePay", "LinkAja"],
};

export const PROVINSI = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Sumatera Selatan",
  "Kepulauan Bangka Belitung", "Bengkulu", "Lampung", "DKI Jakarta", "Banten", "Jawa Barat", "Jawa Tengah",
  "DI Yogyakarta", "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat",
  "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara",
  "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara", "Maluku",
  "Maluku Utara", "Papua", "Papua Barat", "Papua Selatan", "Papua Tengah", "Papua Pegunungan", "Papua Barat Daya",
];

// ref_code = "<username>-<kode platform>[urutan]". Username cuma boleh [a-z0-9_]
// (tanpa "-"), jadi bagian sebelum "-" pertama selalu unik per affiliate dan
// ref_code gak bakal bentrok antar affiliate. Panjang maks 20+1+4+2 = 27 (< 30),
// dan karakternya lolos sanitasi ?ref= di /api/checkout ([a-z0-9_-]).
export function buatRefCode(username, platformKey, urutan = 1) {
  const short = platformByKey(platformKey)?.short || "x";
  return `${username}-${short}${urutan > 1 ? urutan : ""}`;
}
