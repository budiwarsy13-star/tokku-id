import { createClient } from "@supabase/supabase-js";

// Mingguan: kunci komisi yang sudah layak, lalu bikin batch pencairan per
// affiliate. Total di bawah minimum (default Rp50.000, env AFFILIATE_MIN_PAYOUT)
// dibiarkan dan terbawa ke batch minggu depan. Transfernya manual oleh admin
// lewat /api/admin/affiliate/payout.
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const minimum = Math.max(parseInt(process.env.AFFILIATE_MIN_PAYOUT, 10) || 50000, 1);

  const sinkron = await supabaseAdmin.rpc("affiliate_sinkron_komisi", { p_affiliate_id: null, p_hari_tahan: 3 });
  if (sinkron.error) {
    console.error("Cron affiliate-batch (sinkron) error:", sinkron.error.message);
    return Response.json({ error: sinkron.error.message }, { status: 500 });
  }
  const { data, error } = await supabaseAdmin.rpc("affiliate_buat_batch", { p_min: minimum });
  if (error) {
    console.error("Cron affiliate-batch error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ message: "Selesai.", batch_dibuat: data, minimum });
}
