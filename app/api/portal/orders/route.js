// app/api/portal/orders/route.js
// GET  ?phone=08xxx   → ambil semua order buyer by nomor WA
// GET  ?orderId=xxx   → detail 1 order + tracking events + chat + complaint + return

import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const phone   = searchParams.get("phone");
  const orderId = searchParams.get("orderId");

  // ── Detail 1 order ──────────────────────────────────────
  if (orderId) {
    const { data: order } = await supa
      .from("orders")
      .select("*, stores(name, slug, accent_color, logo_url), products(name, images)")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });

    const [{ data: events }, { data: chats }, { data: complaint }, { data: ret }, { data: review }] =
      await Promise.all([
        supa.from("tracking_events").select("*").eq("order_id", orderId).order("occurred_at", { ascending: true }),
        supa.from("chats").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
        supa.from("complaints").select("*").eq("order_id", orderId).maybeSingle(),
        supa.from("order_returns").select("*").eq("order_id", orderId).maybeSingle(),
        supa.from("order_reviews").select("*").eq("order_id", orderId).maybeSingle(),
      ]);

    return Response.json({ order, events: events || [], chats: chats || [], complaint, return: ret, review });
  }

  // ── Semua order by nomor WA ──────────────────────────────
  if (!phone) return Response.json({ error: "phone diperlukan" }, { status: 400 });

  const normalized = phone.replace(/\D/g, "");
  const variants = [
    normalized,
    normalized.startsWith("62") ? "0" + normalized.slice(2) : null,
    normalized.startsWith("0")  ? "62" + normalized.slice(1) : null,
  ].filter(Boolean);

  const { data: orders } = await supa
    .from("orders")
    .select("*, stores(name, slug, accent_color, logo_url), products(name, images, price), order_reviews(id)")
    .in("buyer_phone", variants)
    .order("created_at", { ascending: false });

  return Response.json({ orders: orders || [] });
}
