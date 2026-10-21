import { createClient } from "@supabase/supabase-js";
import { autentikasiSeller } from "@/lib/cod-server";
import { kirimNotifWA } from "@/lib/wa-notify-server";
import { cekRateLimit } from "@/lib/rate-limit-server";

// Dipanggil dashboard seller setelah mengubah status pesanan (dikirim / selesai) supaya
// pembeli dapat WA. WAJIB login seller & pesanan harus milik tokonya. Hanya tipe
// "status_update" yang boleh lewat HTTP; tipe lain hanya dipanggil dari kode server.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req) {
  const auth = await autentikasiSeller(admin, req);
  if (auth.error) return auth.error;

  const { type, orderId } = await req.json().catch(() => ({}));
  if (type !== "status_update" || !orderId) return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });

  const { allowed } = await cekRateLimit(admin, `wa-notify:${auth.store.id}`, 30);
  if (!allowed) return Response.json({ error: "Terlalu banyak request" }, { status: 429 });

  const { data: order } = await admin.from("orders").select("id, store_id").eq("id", orderId).maybeSingle();
  if (!order || order.store_id !== auth.store.id) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });

  const hasil = await kirimNotifWA(admin, { type, orderId });
  return Response.json({ ok: true, ...hasil });
}
