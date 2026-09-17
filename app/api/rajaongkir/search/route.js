import { createClient } from "@supabase/supabase-js";
import { ambilIp, cekRateLimit } from "@/lib/rate-limit-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  // Rate limit: 50 request/menit per IP. Cukup longgar buat buyer yang lagi
  // ketik-ketik nama kota, tapi nutup penyalahgunaan API key RajaOngkir.
  const { allowed } = await cekRateLimit(supabaseAdmin, `rajaongkir:${ambilIp(request)}`, 50);
  if (!allowed) {
    return Response.json({ data: [] }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");

  if (!keyword) {
    return Response.json({ data: [] });
  }

  const res = await fetch(
    `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(keyword)}&limit=10&offset=0`,
    { headers: { key: process.env.RAJAONGKIR_API_KEY } }
  );

  const data = await res.json();
  return Response.json(data);
}