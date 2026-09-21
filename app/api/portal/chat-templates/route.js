// app/api/portal/chat-templates/route.js
// GET  ?storeId=xxx  → ambil semua template aktif milik toko
// POST { storeId, type, question, answer, sortOrder }  → tambah template
// PATCH { id, ...fields }  → update template
// DELETE ?id=xxx  → hapus template

import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return Response.json({ error: "storeId diperlukan" }, { status: 400 });

  const { data, error } = await supa
    .from("chat_templates")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("type")
    .order("sort_order");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Kalau toko belum punya template sama sekali → kasih template default
  if (!data || data.length === 0) {
    const defaults = await insertDefaultTemplates(storeId);
    return Response.json({ templates: defaults });
  }

  return Response.json({ templates: data });
}

async function insertDefaultTemplates(storeId) {
  const defaults = [
    { store_id: storeId, type: "welcome",  sort_order: 0,
      answer: "Halo! Terima kasih sudah berbelanja di toko kami 🙏\nAda yang bisa kami bantu?" },
    { store_id: storeId, type: "faq", sort_order: 1,
      question: "Kapan pesanan saya dikirim?",
      answer:   "Pesanan akan kami proses dan kirim dalam 1×24 jam setelah pembayaran dikonfirmasi. Nomor resi akan segera kami update." },
    { store_id: storeId, type: "faq", sort_order: 2,
      question: "Apakah pembayaran saya sudah dikonfirmasi?",
      answer:   "Pembayaran biasanya dikonfirmasi otomatis dalam beberapa menit. Jika lebih dari 1 jam belum berubah, silakan kirim bukti transfer ke sini." },
    { store_id: storeId, type: "faq", sort_order: 3,
      question: "Pesanan saya belum juga sampai.",
      answer:   "Mohon maaf atas keterlambatannya. Bisa cek nomor resi di tab Pelacakan. Jika ada kendala, kami siap bantu selesaikan 🙏" },
    { store_id: storeId, type: "faq", sort_order: 4,
      question: "Apakah bisa tukar ukuran / warna?",
      answer:   "Untuk penukaran produk, silakan ajukan melalui menu Return di halaman pesanan kamu. Tim kami akan segera merespons." },
    { store_id: storeId, type: "faq", sort_order: 5,
      question: "Ada yang belum dikirim dari paket saya.",
      answer:   "Mohon maaf ada yang terlewat. Tolong kirimkan foto isi paket yang diterima agar kami bisa segera proses pengiriman kekurangannya." },
  ];

  const { data } = await supa.from("chat_templates").insert(defaults).select();
  return data || defaults;
}

export async function POST(req) {
  const body = await req.json();
  const { storeId, type, question, answer, sortOrder } = body;
  if (!storeId || !type || !answer) {
    return Response.json({ error: "storeId, type, answer wajib" }, { status: 400 });
  }

  const { data, error } = await supa.from("chat_templates").insert({
    store_id:   storeId,
    type, question, answer,
    sort_order: sortOrder || 0,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, template: data });
}

export async function PATCH(req) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return Response.json({ error: "id diperlukan" }, { status: 400 });

  const allowed = {};
  if (fields.question  !== undefined) allowed.question   = fields.question;
  if (fields.answer    !== undefined) allowed.answer     = fields.answer;
  if (fields.is_active !== undefined) allowed.is_active  = fields.is_active;
  if (fields.sortOrder !== undefined) allowed.sort_order = fields.sortOrder;

  const { data, error } = await supa.from("chat_templates").update(allowed).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, template: data });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id diperlukan" }, { status: 400 });

  const { error } = await supa.from("chat_templates").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
