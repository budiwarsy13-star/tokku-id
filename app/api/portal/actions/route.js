// POST { action: 'review' | 'complaint' | 'return', orderId, ... }
// Wajib sesi buyer terverifikasi. Toko, produk, nama & no WA diambil dari ORDER di database
// (bukan dari body request), jadi gak bisa dipalsukan untuk pesanan orang lain / toko lain.

import { createClient } from "@supabase/supabase-js";
import { autentikasiBuyer, ambilOrderMilik } from "@/lib/buyer-auth-server";
import { cekRateLimit } from "@/lib/rate-limit-server";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const err = (message, status = 400) => Response.json({ error: message }, { status });
const teks = (v, maks) => String(v ?? "").trim().slice(0, maks);

export async function POST(req) {
  const auth = await autentikasiBuyer(supa, req);
  if (auth.error) return auth.error;
  const { allowed } = await cekRateLimit(supa, `portal-actions:${auth.email}`, 10);
  if (!allowed) return err("Terlalu banyak percobaan. Coba lagi sebentar lagi.", 429);

  const body = await req.json().catch(() => ({}));
  const { action, orderId } = body;
  const order = await ambilOrderMilik(supa, auth.email, orderId, "id, store_id, product_id, buyer_name, buyer_phone, status, payment_method, cod_paid_at");
  if (!order) return err("Order tidak ditemukan", 404);

  const sudahDikirim = order.status === "shipped" || order.status === "selesai";

  // ── Review: hanya setelah pesanan selesai, 1x per pesanan ──
  if (action === "review") {
    if (order.status !== "selesai") return err("Ulasan bisa diberikan setelah pesanan selesai.");
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return err("Rating harus 1-5.");

    const { error } = await supa.from("order_reviews").insert({
      order_id: order.id, product_id: order.product_id, store_id: order.store_id,
      buyer_name: order.buyer_name, buyer_phone: order.buyer_phone,
      rating, review_text: teks(body.reviewText, 1000),
    });
    if (error) return err(error.code === "23505" ? "Pesanan ini sudah diulas." : "Gagal menyimpan ulasan.", error.code === "23505" ? 409 : 500);
    await supa.from("orders").update({ review_submitted: true }).eq("id", order.id);
    return Response.json({ success: true });
  }

  // ── Komplain ──
  if (action === "complaint") {
    if (!sudahDikirim) return err("Komplain bisa diajukan setelah pesanan dikirim.");
    const type = teks(body.type, 100), description = teks(body.description, 2000);
    if (!type || !description) return err("Jenis dan deskripsi komplain wajib diisi.");

    const { data: existing } = await supa.from("complaints").select("id").eq("order_id", order.id).maybeSingle();
    if (existing) return err("Komplain untuk pesanan ini sudah ada", 409);

    const { error } = await supa.from("complaints").insert({
      order_id: order.id, store_id: order.store_id,
      buyer_name: order.buyer_name, buyer_phone: order.buyer_phone,
      type, description, involves_cs: !!body.involvesCs,
    });
    if (error) return err(error.code === "23505" ? "Komplain untuk pesanan ini sudah ada" : "Gagal menyimpan komplain.", error.code === "23505" ? 409 : 500);

    await supa.from("notifications").insert({
      store_id: order.store_id, order_id: order.id, type: "complaint",
      title: "Komplain baru dari pembeli",
      message: `${order.buyer_name || "Pembeli"} mengajukan komplain: ${type}`,
      url: `/dashboard/pesanan?orderId=${order.id}`,
    });
    return Response.json({ success: true });
  }

  // ── Return ──
  if (action === "return") {
    if (!sudahDikirim) return err("Return bisa diajukan setelah pesanan dikirim.");
    const reason = teks(body.reason, 100), description = teks(body.description, 2000);
    if (!reason) return err("Alasan return wajib diisi.");

    const { data: existing } = await supa.from("order_returns").select("id").eq("order_id", order.id).maybeSingle();
    if (existing) return err("Permintaan return sudah diajukan", 409);

    const { error } = await supa.from("order_returns").insert({
      order_id: order.id, store_id: order.store_id,
      buyer_name: order.buyer_name, buyer_phone: order.buyer_phone, reason, description,
    });
    if (error) return err(error.code === "23505" ? "Permintaan return sudah diajukan" : "Gagal menyimpan permintaan return.", error.code === "23505" ? 409 : 500);

    await supa.from("notifications").insert({
      store_id: order.store_id, order_id: order.id, type: "return_request",
      title: "Permintaan return",
      message: `${order.buyer_name || "Pembeli"} mengajukan return: ${reason}`,
      url: `/dashboard/pesanan?orderId=${order.id}`,
    });
    return Response.json({ success: true });
  }

  return err("action tidak dikenal");
}
