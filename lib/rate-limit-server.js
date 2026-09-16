// Helper rate limiting — dipanggil di awal endpoint publik yang rawan
// disalahgunakan (brute-force Order ID, enumerasi kode diskon, dll).

export function ambilIp(request) {
  // Vercel otomatis nyisipin header ini, jadi bisa diandalkan buat identifikasi
  // "siapa" yang request tanpa perlu login.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Balikin { allowed: boolean, sisaTunggu: detik } — window waktu tetap
// (fixed window) per menit, cukup buat nahan brute-force kasar tanpa
// bikin arsitektur ribet.
export async function cekRateLimit(supabaseAdmin, key, maxPercobaan = 10) {
  const sekarang = new Date();
  const windowStart = new Date(Math.floor(sekarang.getTime() / 60000) * 60000).toISOString();

  const { data: count, error } = await supabaseAdmin.rpc("increment_rate_limit", {
    p_key: key,
    p_window: windowStart,
  });

  if (error) {
    // Kalau rate limiter-nya sendiri error, jangan sampai nge-block orang
    // yang legit — gagal secara "terbuka" (fail open), cuma log doang.
    console.error("Rate limit check error:", error.message);
    return { allowed: true };
  }

  return { allowed: count <= maxPercobaan };
}
