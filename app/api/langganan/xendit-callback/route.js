// Callback invoice Xendit -> aktifkan paket. Daftarkan URL ini di dashboard Xendit
// (Settings > Webhooks > Invoice paid & expired) dan isi XENDIT_CALLBACK_TOKEN.
// BELUM DIUJI ke sandbox Xendit.
import { createClient } from "@supabase/supabase-js";
import { callbackXenditValid } from "@/lib/billing/xendit";
import { aktifkanPaket, tandaiTagihanGagal } from "@/lib/plan-server";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  if (!callbackXenditValid(request)) return Response.json({ error: "Token callback tidak valid" }, { status: 401 });
  try {
    const body = await request.json();
    const orderId = String(body.external_id || "");
    if (!orderId.startsWith("SUB-")) return Response.json({ ok: true }); // bukan tagihan langganan
    if (body.status === "PAID" || body.status === "SETTLED") {
      await aktifkanPaket(supabaseAdmin, orderId, body.amount);
    } else if (body.status === "EXPIRED") {
      await tandaiTagihanGagal(supabaseAdmin, orderId, "expired");
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Callback Xendit error:", e);
    return Response.json({ error: "Gagal memproses callback" }, { status: 500 });
  }
}
