// POST  { orderId, message }  -> buyer kirim pesan (pengirim SELALU "buyer", tidak bisa dipalsukan)
// POST  { orderId, faqId }    -> buyer klik FAQ: server menyimpan pertanyaan + jawaban bot dari DB
// PUT   { orderId }           -> inisialisasi pesan sambutan toko (sekali)
// PATCH { orderId }           -> buyer menandai pesan penjual sudah dibaca
// Semua wajib sesi buyer terverifikasi + order harus milik email tersebut.

import { createClient } from "@supabase/supabase-js";
import { autentikasiBuyer, ambilOrderMilik } from "@/lib/buyer-auth-server";
import { cekRateLimit } from "@/lib/rate-limit-server";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MAKS_PESAN = 1000;

async function siapkan(req, orderId, limitPerMenit) {
  const auth = await autentikasiBuyer(supa, req);
  if (auth.error) return { error: auth.error };
  const { allowed } = await cekRateLimit(supa, `portal-chat:${auth.email}`, limitPerMenit);
  if (!allowed) return { error: Response.json({ error: "Terlalu banyak pesan. Tunggu sebentar." }, { status: 429 }) };
  const order = await ambilOrderMilik(supa, auth.email, orderId, "id, store_id, buyer_name");
  if (!order) return { error: Response.json({ error: "Order tidak ditemukan" }, { status: 404 }) };
  return { order };
}

export async function POST(req) {
  const { orderId, message, faqId } = await req.json().catch(() => ({}));
  const s = await siapkan(req, orderId, 30);
  if (s.error) return s.error;
  const { order } = s;
  const namaBuyer = order.buyer_name || "Pembeli";

  // ── Klik FAQ: jawaban diambil dari database, bukan dari client ──
  if (faqId) {
    const { data: tmpl } = await supa.from("chat_templates").select("question, answer")
      .eq("id", faqId).eq("store_id", order.store_id).eq("type", "faq").eq("is_active", true).maybeSingle();
    if (!tmpl) return Response.json({ error: "Pertanyaan tidak ditemukan" }, { status: 404 });

    const { data: rows, error } = await supa.from("chats").insert([
      { order_id: orderId, store_id: order.store_id, sender_type: "buyer", sender_name: namaBuyer, message: tmpl.question, is_read: true },
      { order_id: orderId, store_id: order.store_id, sender_type: "bot", sender_name: "Pesan Otomatis", message: tmpl.answer, is_read: true },
    ]).select();
    if (error) return Response.json({ error: "Gagal menyimpan pesan" }, { status: 500 });
    return Response.json({ success: true, chats: rows });
  }

  const teks = String(message || "").trim();
  if (!teks) return Response.json({ error: "Pesan kosong" }, { status: 400 });
  if (teks.length > MAKS_PESAN) return Response.json({ error: `Pesan maksimal ${MAKS_PESAN} karakter` }, { status: 400 });

  const { data, error } = await supa.from("chats").insert({
    order_id: orderId, store_id: order.store_id,
    sender_type: "buyer", sender_name: namaBuyer, message: teks, is_read: false,
  }).select().single();
  if (error) return Response.json({ error: "Gagal menyimpan pesan" }, { status: 500 });

  await supa.from("notifications").insert({
    store_id: order.store_id, order_id: orderId, type: "chat_masuk",
    title: "Pesan baru dari pembeli",
    message: `${namaBuyer}: ${teks.slice(0, 60)}${teks.length > 60 ? "..." : ""}`,
    url: "/dashboard/pesanan",
  });
  return Response.json({ success: true, chat: data });
}

export async function PUT(req) {
  const { orderId } = await req.json().catch(() => ({}));
  const s = await siapkan(req, orderId, 30);
  if (s.error) return s.error;
  const { order } = s;

  const { data: existing } = await supa.from("chats").select("id").eq("order_id", orderId).limit(1);
  if (existing && existing.length > 0) return Response.json({ success: true, alreadyInitialized: true });

  const { data: templates } = await supa.from("chat_templates").select("answer")
    .eq("store_id", order.store_id).eq("type", "welcome").eq("is_active", true).order("sort_order").limit(1);
  const welcomeMsg = templates?.[0]?.answer || "Halo! Terima kasih sudah berbelanja. Ada yang bisa kami bantu?";

  const { data: chat } = await supa.from("chats").insert({
    order_id: orderId, store_id: order.store_id,
    sender_type: "bot", sender_name: "Pesan Otomatis", message: welcomeMsg, is_read: true,
  }).select().single();
  return Response.json({ success: true, chat });
}

export async function PATCH(req) {
  const { orderId } = await req.json().catch(() => ({}));
  const s = await siapkan(req, orderId, 60);
  if (s.error) return s.error;
  await supa.from("chats").update({ is_read: true }).eq("order_id", orderId).eq("sender_type", "seller");
  return Response.json({ success: true });
}
