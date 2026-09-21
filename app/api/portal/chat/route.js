// app/api/portal/chat/route.js
// POST { orderId, message, senderType, senderName } → kirim pesan
// PATCH { chatId } → mark as read

import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { orderId, message, senderType, senderName } = await req.json();
  if (!orderId || !message || !senderType) {
    return Response.json({ error: "orderId, message, senderType wajib" }, { status: 400 });
  }

  // Ambil storeId dari order
  const { data: order } = await supa.from("orders").select("store_id, buyer_name").eq("id", orderId).maybeSingle();
  if (!order) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });

  const { data, error } = await supa.from("chats").insert({
    order_id:    orderId,
    store_id:    order.store_id,
    sender_type: senderType,
    sender_name: senderName,
    message,
    is_read: senderType === "bot" ? true : false,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Kirim notifikasi ke seller kalau buyer yang kirim (bukan bot)
  if (senderType === "buyer") {
    await supa.from("notifications").insert({
      store_id: order.store_id,
      order_id: orderId,
      type:     "chat_masuk",
      title:    "Pesan baru dari pembeli",
      message:  `${senderName || "Pembeli"}: ${message.slice(0, 60)}${message.length > 60 ? "..." : ""}`,
      url:      `/dashboard/pesanan`,
    });
  }

  return Response.json({ success: true, chat: data });
}

// Endpoint khusus untuk init chat (welcome + kirim pesan bot)
export async function PUT(req) {
  const { orderId, storeId } = await req.json();
  if (!orderId || !storeId) return Response.json({ error: "orderId dan storeId wajib" }, { status: 400 });

  // Cek apakah sudah ada chat untuk order ini
  const { data: existing } = await supa.from("chats").select("id").eq("order_id", orderId).limit(1);
  if (existing && existing.length > 0) {
    return Response.json({ success: true, alreadyInitialized: true });
  }

  // Ambil welcome template milik toko
  const { data: templates } = await supa
    .from("chat_templates")
    .select("*")
    .eq("store_id", storeId)
    .eq("type", "welcome")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1);

  const welcomeMsg = templates?.[0]?.answer || "Halo! Terima kasih sudah berbelanja. Ada yang bisa kami bantu?";

  // Kirim welcome message sebagai 'bot'
  const { data: chat } = await supa.from("chats").insert({
    order_id:    orderId,
    store_id:    storeId,
    sender_type: "bot",
    sender_name: "Pesan Otomatis",
    message:     welcomeMsg,
    is_read:     true,
  }).select().single();

  return Response.json({ success: true, chat });
}

export async function PATCH(req) {
  const { orderId, senderType } = await req.json();
  // Mark semua pesan dari senderType tertentu sebagai read
  const readBy = senderType === "seller" ? "buyer" : "seller";
  await supa.from("chats").update({ is_read: true })
    .eq("order_id", orderId).eq("sender_type", readBy);
  return Response.json({ success: true });
}
