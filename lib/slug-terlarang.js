// Slug toko = alamat storefront (tokku.id/<slug>). Beberapa nama sudah dipakai
// halaman sistem di tokku.id, jadi gak boleh dipakai toko. Daftar ini HARUS sama
// dengan trigger DB `stores_slug_terlarang` (supabase-migrations/012).
export const SLUG_TERLARANG = [
  "affiliate", "admin", "api", "dashboard", "daftar", "masuk", "login", "keluar", "logout",
  "portal", "lacak", "berhenti", "checkout", "bantuan", "terms", "privacy", "syarat", "kebijakan",
  "static", "assets", "public", "favicon.ico", "robots.txt", "sitemap.xml", "manifest.json", "sw.js",
  "tokku", "www", "app", "support", "help",
];
export const slugTerlarang = (s) => SLUG_TERLARANG.includes(String(s || "").toLowerCase());
