import { createClient } from "@supabase/supabase-js";
import { ambilIp, cekRateLimit } from "@/lib/rate-limit-server";
import { verifikasiKode, normalisasiEmail } from "@/lib/buyer-auth-server";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalisasiEmail(body.email);

    const [ip, perEmail] = await Promise.all([
      cekRateLimit(admin, `buyer-verif-ip:${ambilIp(request)}`, 20),
      cekRateLimit(admin, `buyer-verif-email:${email}`, 10),
    ]);
    if (!ip.allowed || !perEmail.allowed) {
      return Response.json({ success: false, message: "Terlalu banyak percobaan. Coba lagi sebentar lagi." }, { status: 429 });
    }

    const hasil = await verifikasiKode(admin, email, body.code);
    return Response.json(hasil, { status: hasil.success ? 200 : 400 });
  } catch (e) {
    console.error("buyer verifikasi error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
