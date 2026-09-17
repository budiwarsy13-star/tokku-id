import { createClient } from "@supabase/supabase-js";
import { ambilIp, cekRateLimit } from "@/lib/rate-limit-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { allowed } = await cekRateLimit(supabaseAdmin, `rajaongkir:${ambilIp(request)}`, 50);
  if (!allowed) {
    return Response.json({ data: [] }, { status: 429 });
  }

  const body = await request.json();
  const { origin, destination, weight } = body;

  const params = new URLSearchParams();
  params.append("origin", origin);
  params.append("destination", destination);
  params.append("weight", weight);
  params.append("courier", "jne:jnt:sicepat:anteraja:pos");
  params.append("price", "lowest");

  const res = await fetch("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost", {
    method: "POST",
    headers: {
      key: process.env.RAJAONGKIR_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await res.json();
  return Response.json(data);
}