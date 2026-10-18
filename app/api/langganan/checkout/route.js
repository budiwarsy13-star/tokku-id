// Seller klik "Upgrade ke Pro" -> buat tagihan langganan.
// KEAMANAN: harga & periode SELALU dari lib/plans.js (server), bukan dari body request;
// toko SELALU dari akun yang login, bukan dari body.
import { createClient } from "@supabase/supabase-js";
import { cekRateLimit } from "@/lib/rate-limit-server";
import { HARGA, PERIODE, AKTIFKAN_TAHUNAN } from "@/lib/plans";
import { buatTagihan, providerAktif } from "@/lib/billing";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  let orderId = null;
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return Response.json({ success: false, message: "Belum login." }, { status: 401 });
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) return Response.json({ success: false, message: "Sesi login gak valid." }, { status: 401 });
    const user = userData.user;

    const { allowed } = await cekRateLimit(supabaseAdmin, `langganan:${user.id}`, 6);
    if (!allowed) return Response.json({ success: false, message: "Terlalu banyak percobaan. Tunggu sebentar." }, { status: 429 });

    const { data: store } = await supabaseAdmin.from("stores").select("id, name").eq("user_id", user.id).maybeSingle();
    if (!store) return Response.json({ success: false, message: "Kamu belum punya toko." }, { status: 404 });

    const { periode } = await request.json().catch(() => ({}));
    if (!PERIODE[periode] || (periode === "tahunan" && !AKTIFKAN_TAHUNAN)) {
      return Response.json({ success: false, message: "Periode langganan gak valid." }, { status: 400 });
    }
    const amount = HARGA[periode];
    const bulan = PERIODE[periode].bulan;

    const idPendek = String(store.id).replace(/-/g, "").slice(0, 12);
    orderId = `SUB-${idPendek}-${Date.now().toString(36)}`;
    const provider = providerAktif();

    const { error: errInsert } = await supabaseAdmin.from("plan_payments").insert({
      store_id: store.id, order_id: orderId, provider, period_months: bulan, amount, status: "pending",
    });
    if (errInsert) return Response.json({ success: false, message: "Gagal membuat tagihan: " + errInsert.message }, { status: 500 });

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://tokku-id.vercel.app";
    const tagihan = await buatTagihan({
      orderId, amount,
      deskripsi: `tokku.id Pro ${PERIODE[periode].label}`,
      email: user.email, nama: store.name,
      redirectUrl: `${origin}/dashboard/langganan?bayar=selesai`,
    });
    return Response.json({ success: true, orderId, amount, ...tagihan });
  } catch (e) {
    console.error("Checkout langganan error:", e);
    if (orderId) await supabaseAdmin.from("plan_payments").update({ status: "failed" }).eq("order_id", orderId);
    return Response.json({ success: false, message: "Gagal membuat tagihan, coba lagi." }, { status: 500 });
  }
}
