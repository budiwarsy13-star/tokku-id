// GET            -> semua pesanan milik buyer yang SUDAH TERVERIFIKASI (lewat email OTP)
// GET ?orderId=  -> detail 1 pesanan + tracking + chat + komplain + return + ulasan
// Semua wajib header Authorization: Bearer <token sesi buyer>. Kepemilikan dicek lewat email
// sesi = orders.buyer_email, BUKAN lagi tebak-tebakan Order ID / nomor WA.

import { createClient } from "@supabase/supabase-js";
import { autentikasiBuyer } from "@/lib/buyer-auth-server";
import { cekRateLimit } from "@/lib/rate-limit-server";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(req) {
  const auth = await autentikasiBuyer(supa, req);
  if (auth.error) return auth.error;

  const { allowed } = await cekRateLimit(supa, `portal-orders:${auth.email}`, 60);
  if (!allowed) return Response.json({ error: "Terlalu banyak request." }, { status: 429 });

  const orderId = new URL(req.url).searchParams.get("orderId");

  if (orderId) {
    const { data: order } = await supa
      .from("orders")
      .select("*, stores(name, slug, accent_color, logo_url), products(name, images)")
      .eq("id", orderId)
      .eq("buyer_email", auth.email)
      .maybeSingle();
    if (!order) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });

    const [{ data: events }, { data: chats }, { data: complaint }, { data: ret }, { data: review }] = await Promise.all([
      supa.from("tracking_events").select("*").eq("order_id", orderId).order("occurred_at", { ascending: true }),
      supa.from("chats").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
      supa.from("complaints").select("*").eq("order_id", orderId).maybeSingle(),
      supa.from("order_returns").select("*").eq("order_id", orderId).maybeSingle(),
      supa.from("order_reviews").select("*").eq("order_id", orderId).maybeSingle(),
    ]);
    return Response.json({ order, events: events || [], chats: chats || [], complaint, return: ret, review });
  }

  const { data: orders } = await supa
    .from("orders")
    .select("*, stores(name, slug, accent_color, logo_url), products(name, images, price), order_reviews(id)")
    .eq("buyer_email", auth.email)
    .order("created_at", { ascending: false });
  return Response.json({ orders: orders || [], email: auth.email });
}
