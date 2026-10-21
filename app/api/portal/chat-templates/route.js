// app/api/portal/chat-templates/route.js
// GET  ?storeId=xxx  → ambil semua template aktif milik toko
// POST { storeId, type, question, answer, sortOrder }  → tambah template
// PATCH { id, ...fields }  → update template
// DELETE ?id=xxx  → hapus template

import { createClient } from "@supabase/supabase-js";
import { autentikasiSeller } from "@/lib/cod-server";

const MAKS_PERTANYAAN = 200;
const MAKS_JAWABAN = 1000;
const TIPE_BOLEH = ["welcome", "faq"];

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("store_id") || searchParams.get("storeId");
  if (!storeId) return Response.json({ error: "storeId diperlukan" }, { status: 400 });

  // Pembeli (publik) cuma lihat template AKTIF. Pemilik toko (bawa token login) lihat semuanya,
  // supaya template yang dinonaktifkan tetap muncul di editor dan bisa diaktifkan lagi.
  let semua = false;
  if (req.headers.get("authorization")) {
    const auth = await autentikasiSeller(supa, req);
    semua = !auth.error && auth.store.id === storeId;
  }

  let query = supa.from("chat_templates").select("*").eq("store_id", storeId);
  if (!semua) query = query.eq("is_active", true);
  const { data, error } = await query.order("type").order("sort_order");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Kalau toko BELUM PERNAH punya template → buatkan template default.
  // (Cek total baris, bukan cuma yang aktif: kalau seller sengaja menonaktifkan semua,
  //  jangan dibuatkan default lagi.)
  if (!data || data.length === 0) {
    const { count } = await supa.from("chat_templates").select("id", { count: "exact", head: true }).eq("store_id", storeId);
    if (!count) {
      const defaults = await insertDefaultTemplates(storeId);
      return Response.json({ templates: semua ? defaults : defaults.filter((t) => t.is_active !== false) });
    }
    return Response.json({ templates: [] });
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
  const auth = await autentikasiSeller(supa, req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const type = TIPE_BOLEH.includes(body.type) ? body.type : null;
  const answer = String(body.answer ?? "").trim().slice(0, MAKS_JAWABAN);
  const question = body.question == null ? null : String(body.question).trim().slice(0, MAKS_PERTANYAAN);
  if (!type || !answer) return Response.json({ error: "type dan answer wajib" }, { status: 400 });
  if (type === "faq" && !question) return Response.json({ error: "Pertanyaan FAQ wajib diisi" }, { status: 400 });

  // storeId SELALU dari sesi login, bukan dari body.
  const { data, error } = await supa.from("chat_templates").insert({
    store_id: auth.store.id, type, question, answer,
    sort_order: Number.isInteger(body.sort_order ?? body.sortOrder) ? (body.sort_order ?? body.sortOrder) : 0,
    is_active: body.is_active ?? true,
  }).select().single();

  if (error) return Response.json({ error: "Gagal menyimpan template" }, { status: 500 });
  return Response.json({ success: true, template: data });
}

export async function PATCH(req) {
  const auth = await autentikasiSeller(supa, req);
  if (auth.error) return auth.error;

  const { id, ...fields } = await req.json().catch(() => ({}));
  if (!id) return Response.json({ error: "id diperlukan" }, { status: 400 });

  const allowed = {};
  if (fields.question  !== undefined) allowed.question   = String(fields.question ?? "").trim().slice(0, MAKS_PERTANYAAN);
  if (fields.answer    !== undefined) allowed.answer     = String(fields.answer ?? "").trim().slice(0, MAKS_JAWABAN);
  if (fields.is_active !== undefined) allowed.is_active  = !!fields.is_active;
  if (fields.sortOrder !== undefined && Number.isInteger(fields.sortOrder)) allowed.sort_order = fields.sortOrder;
  if (allowed.answer === "") return Response.json({ error: "Jawaban tidak boleh kosong" }, { status: 400 });

  // .eq("store_id", ...) memastikan seller hanya bisa mengubah template tokonya sendiri.
  const { data, error } = await supa.from("chat_templates").update(allowed)
    .eq("id", id).eq("store_id", auth.store.id).select().maybeSingle();
  if (error) return Response.json({ error: "Gagal memperbarui template" }, { status: 500 });
  if (!data) return Response.json({ error: "Template tidak ditemukan" }, { status: 404 });
  return Response.json({ success: true, template: data });
}

export async function DELETE(req) {
  const auth = await autentikasiSeller(supa, req);
  if (auth.error) return auth.error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id diperlukan" }, { status: 400 });

  const { data, error } = await supa.from("chat_templates").delete()
    .eq("id", id).eq("store_id", auth.store.id).select("id");
  if (error) return Response.json({ error: "Gagal menghapus template" }, { status: 500 });
  if (!data || data.length === 0) return Response.json({ error: "Template tidak ditemukan" }, { status: 404 });
  return Response.json({ success: true });
}
