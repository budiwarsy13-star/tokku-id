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
  const { data: order } = await supa.from("orders").select("store_id").eq("id", orderId).maybeSingle();
  if (!order) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });

  const { data, error } = await supa.from("chats").insert({
    order_id: orderId,
    store_id: order.store_id,
    sender_type: senderType,
    sender_name: senderName,
    message,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Kirim notifikasi ke seller kalau buyer yang kirim
  if (senderType === "buyer") {
    await supa.from("notifications").insert({
      store_id: order.store_id,
      order_id: orderId,
      type: "chat_masuk",
      title: "Pesan baru dari pembeli",
      message: `${senderName || "Pembeli"}: ${message.slice(0, 60)}${message.length > 60 ? "..." : ""}`,
      url: `/dashboard/pesanan?orderId=${orderId}`,
    }).select();
  }

  return Response.json({ success: true, chat: data });
}

export async function PATCH(req) {
  const { orderId, senderType } = await req.json();
  // Mark semua pesan dari senderType tertentu sebagai read
  const readBy = senderType === "seller" ? "buyer" : "seller";
  await supa.from("chats").update({ is_read: true })
    .eq("order_id", orderId).eq("sender_type", readBy);
  return Response.json({ success: true });
}
