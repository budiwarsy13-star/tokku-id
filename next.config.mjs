// Asal Supabase (diambil dari env) — satu-satunya pihak luar yang boleh dihubungi halaman admin.
const supabaseOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin; } catch { return "https://*.supabase.co"; }
})();
const supabaseWs = supabaseOrigin.replace(/^https/, "wss");
const dev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Terapkan ke semua route
        source: "/(.*)",
        headers: [
          // Cegah clickjacking — halaman tokku.id tidak boleh di-embed
          // di iframe situs lain (serangan overlay transparan di atas
          // tombol "Bayar Sekarang" misalnya).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },

          // Browser jangan "menebak" tipe file — cegah file yang diupload
          // diinterpretasikan sebagai script berbahaya.
          { key: "X-Content-Type-Options", value: "nosniff" },

          // URL dengan parameter sensitif tidak bocor ke pihak ketiga
          // (analytics, CDN, tracking pixel pihak lain).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Batasi fitur browser sensitif yang tidak dibutuhkan tokku.id.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },

          // Paksa HTTPS — browser tidak akan turun ke HTTP sekali
          // terhubung ke tokku.id (2 tahun, termasuk subdomain).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        // Area ADMIN: jangan pernah di-cache/diindeks, tanpa referrer, dan CSP ketat:
        // skrip hanya dari domain sendiri, koneksi hanya ke domain sendiri + Supabase, tidak boleh di-iframe.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${supabaseOrigin} ${supabaseWs}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
          },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
