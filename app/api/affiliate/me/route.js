import { supabaseAdmin, autentikasiAffiliate, topengAffiliate } from "@/lib/affiliate-server";

// Profil affiliate yang lagi login. Data sensitif (NIK, no. rekening) TIDAK
// pernah dikirim ke browser -- cuma 4 digit terakhir.
export async function GET(request) {
  const auth = await autentikasiAffiliate(request);
  if (auth.error) return auth.error;
  const { affiliate } = auth;

  const [{ data: kyc }, { data: channels }] = await Promise.all([
    supabaseAdmin.from("affiliate_kyc").select("*").eq("affiliate_id", affiliate.id).maybeSingle(),
    supabaseAdmin.from("affiliate_channels").select("*").eq("affiliate_id", affiliate.id).order("created_at", { ascending: true }),
  ]);
  return Response.json({ success: true, affiliate: topengAffiliate(affiliate, kyc, channels) });
}
