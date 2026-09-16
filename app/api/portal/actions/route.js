// app/api/portal/actions/route.js
// POST { action: 'review' | 'complaint' | 'return', ...data }

import { createClient } from "@supabase/supabase-js";
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const body = await req.json();
  const { action } = body;

  // ── Review ───────────────────────────────────────────────
  if (action === "review") {
    const { orderId, productId, storeId, buyerName, buyerPhone, rating, reviewText } = body;
    const { error } = await supa.from("order_reviews").insert({
      order_id: orderId, product_id: productId, store_id: storeId,
      buyer_name: buyerName, buyer_phone: buyerPhone, rating, review_text: reviewText,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    // Tandai order sudah diulas
    await supa.from("orders").update({ review_submitted: true }).eq("id", orderId);
    return Response.json({ success: true });
  }

  // ── Complaint ────────────────────────────────────────────
  if (action === "complaint") {
    const { orderId, storeId, buyerName, buyerPhone, type, description, involvesCs } = body;
    const { data: existing } = await supa.from("complaints").select("id").eq("order_id", orderId).maybeSingle();
    if (existing) return Response.json({ error: "Komplain untuk pesanan ini sudah ada" }, { status: 409 });

    const { error } = await supa.from("complaints").insert({
      order_id: orderId, store_id: storeId,
      buyer_name: buyerName, buyer_phone: buyerPhone,
      type, description, involves_cs: involvesCs || false,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await supa.from("notifications").insert({
      store_id: storeId, order_id: orderId,
      type: "complaint",
      title: "Komplain baru dari pembeli",
      message: `${buyerName || "Pembeli"} mengajukan komplain: ${type}`,
      url: `/dashboard/pesanan?orderId=${orderId}`,
    });
    return Response.json({ success: true });
  }

  // ── Return ───────────────────────────────────────────────
  if (action === "return") {
    const { orderId, storeId, buyerName, buyerPhone, reason, description } = body;
    const { data: existing } = await supa.from("order_returns").select("id").eq("order_id", orderId).maybeSingle();
    if (existing) return Response.json({ error: "Permintaan return sudah diajukan" }, { status: 409 });

    const { error } = await supa.from("order_returns").insert({
      order_id: orderId, store_id: storeId,
      buyer_name: buyerName, buyer_phone: buyerPhone,
      reason, description,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await supa.from("notifications").insert({
      store_id: storeId, order_id: orderId,
      type: "return_request",
      title: "Permintaan return",
      message: `${buyerName || "Pembeli"} mengajukan return: ${reason}`,
      url: `/dashboard/pesanan?orderId=${orderId}`,
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: "action tidak dikenal" }, { status: 400 });
}
