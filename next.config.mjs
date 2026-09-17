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
    ];
  },
};

export default nextConfig;
