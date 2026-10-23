import { createClient } from "@supabase/supabase-js";

// Harian: sinkronkan status komisi dengan status order
// (pending -> terkunci setelah order selesai + masa tahan 3 hari; -> batal kalau
// order gagal / return disetujui). Idempotent, aman dijalankan berulang.
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin.rpc("affiliate_sinkron_komisi", { p_affiliate_id: null, p_hari_tahan: 3 });
  if (error) {
    console.error("Cron affiliate-komisi error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ message: "Selesai.", ...data });
}
