import { cekRateLimit, ambilIp } from "@/lib/rate-limit-server";
import { supabaseAdmin, autentikasiAffiliate } from "@/lib/affiliate-server";

// Cek ketersediaan username (buat form pendaftaran). Butuh sesi OTP supaya gak
// bisa dipakai orang luar buat nyisir daftar username.
export async function GET(request) {
  const auth = await autentikasiAffiliate(request);
  if (auth.error) return auth.error;

  const { allowed } = await cekRateLimit(supabaseAdmin, `aff-user:${ambilIp(request)}`, 30);
  if (!allowed) return Response.json({ success: false, message: "Terlalu banyak percobaan." }, { status: 429 });

  const u = String(new URL(request.url).searchParams.get("u") || "").toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) return Response.json({ success: true, valid: false, tersedia: false });

  const { data } = await supabaseAdmin.from("affiliates").select("id").eq("username", u).maybeSingle();
  return Response.json({ success: true, valid: true, tersedia: !data || data.id === auth.affiliate.id });
}
