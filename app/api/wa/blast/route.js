// WA Blast ke pembeli lama. Dua aksi:
//   { action: "preview" }                     -> jumlah penerima per segmen + status cooldown
//   { action: "send", segment, message }      -> kirim lewat Fonnte (antrean + jeda acak)
//
// Pengaman (supaya nomor pengirim gak diblokir WhatsApp & gak ganggu seller lain):
// - hanya pembeli yang PERNAH BAYAR di toko itu; yang sudah klik "berhenti" dikecualikan
// - maks 100 penerima per blast, 1 blast per 24 jam per toko
// - jeda acak 15-40 detik antar pesan (diatur Fonnte), tiap pesan ada link berhenti
//
// Cooldown 24 jam di-klaim pakai UPDATE ... WHERE wa_last_blast_at < cutoff (compare-
// and-swap atomik di level row Postgres), BUKAN "SELECT blast terakhir lalu INSERT
// terpisah". Dengan cara lama itu, dua request "send" yang nyaris barengan bisa
// dua-duanya lolos cek cooldown sebelum salah satu sempat nyatet -> kirim dobel.
// Compare-and-swap ini jadiin klaim slotnya race-safe: cuma 1 request yang bisa
// "menang" UPDATE-nya, siapapun yang kalah bakal lihat wa_last_blast_at udah
// ke-update dan gagal di kondisi WHERE-nya.
import { createClient } from "@supabase/supabase-js";
import { normalisasiTelepon, teleponValid, buatSigOptout, bersihkanNama, susunPesan, kirimFonnte } from "@/lib/wa-server";
import { bolehPakaiFitur, FITUR_BERBAYAR } from "@/lib/plan";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MAX_PER_BLAST = 100;
const COOLDOWN_MS = 24 * 3600 * 1000;
const HARI_DIAM = 60;
const SEGMEN = ["semua", "repeat", "diam"];

async function ambilPelanggan(storeId) {
  const baris = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await supabaseAdmin.from("orders")
      .select("id, midtrans_order_id, buyer_name, buyer_phone, paid_at, created_at")
      .eq("store_id", storeId).in("status", ["paid", "shipped", "selesai"])
      .order("created_at", { ascending: false }).range(from, from + 999);
    if (error || !data) break;
    baris.push(...data);
    if (data.length < 1000) break;
  }
  const { data: opt } = await supabaseAdmin.from("wa_optouts").select("phone").eq("store_id", storeId);
  const berhenti = new Set((opt || []).map((o) => o.phone));

  const peta = new Map(); // baris sudah urut terbaru -> yang pertama ketemu = nama terbaru
  for (const o of baris) {
    const phone = normalisasiTelepon(o.buyer_phone);
    if (!teleponValid(phone) || berhenti.has(phone)) continue;
    const waktu = new Date(o.paid_at || o.created_at).getTime();
    const p = peta.get(phone) || { phone, nama: bersihkanNama(o.buyer_name), trx: new Set(), terakhir: 0 };
    p.trx.add(o.midtrans_order_id || o.id);
    p.terakhir = Math.max(p.terakhir, waktu);
    peta.set(phone, p);
  }
  return { pelanggan: Array.from(peta.values()).sort((a, b) => b.terakhir - a.terakhir), jumlahBerhenti: berhenti.size };
}

function filterSegmen(pelanggan, segmen) {
  if (segmen === "repeat") return pelanggan.filter((p) => p.trx.size >= 2);
  if (segmen === "diam") return pelanggan.filter((p) => Date.now() - p.terakhir > HARI_DIAM * 24 * 3600 * 1000);
  return pelanggan;
}

export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return Response.json({ success: false, message: "Belum login." }, { status: 401 });
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) return Response.json({ success: false, message: "Sesi login gak valid." }, { status: 401 });

    // storeId SELALU dari akun yang login, bukan dari body.
    const { data: store } = await supabaseAdmin.from("stores")
      .select("id, name, slug, wa_last_blast_at, plan, plan_aktif_sampai").eq("user_id", userData.user.id).maybeSingle();
    if (!store) return Response.json({ success: false, message: "Kamu belum punya toko." }, { status: 404 });

    // WA Blast fitur berbayar. "preview" tetap kebuka buat semua (biar
    // seller gratis lihat ada berapa pelanggan yang bisa di-blast -- teaser
    // buat upgrade), tapi "send" yang beneran ngirim WA dikunci di sini.
    const waBlastBoleh = bolehPakaiFitur(store, FITUR_BERBAYAR.WA_BLAST);

    const body = await request.json().catch(() => ({}));
    const { pelanggan, jumlahBerhenti } = await ambilPelanggan(store.id);

    const sisaMs = COOLDOWN_MS - (Date.now() - new Date(store.wa_last_blast_at).getTime());
    const bisaKirimLagiPada = sisaMs > 0 ? new Date(Date.now() + sisaMs).toISOString() : null;

    if (body.action === "preview") {
      return Response.json({
        success: true,
        jumlah: Object.fromEntries(SEGMEN.map((s) => [s, filterSegmen(pelanggan, s).length])),
        maksPerBlast: MAX_PER_BLAST, jumlahBerhenti, bisaKirimLagiPada,
        waSiap: !!process.env.WA_API_KEY,
        waBlastBoleh,
      });
    }

    if (body.action !== "send") return Response.json({ success: false, message: "Aksi gak dikenal." }, { status: 400 });

    if (!waBlastBoleh) {
      return Response.json({ success: false, message: "WA Blast itu fitur berbayar. Upgrade paket kamu buat kirim promo ke pelanggan lama.", perluUpgrade: true }, { status: 402 });
    }

    if (!process.env.WA_API_KEY) return Response.json({ success: false, message: "Layanan WA belum dikonfigurasi." }, { status: 500 });
    if (!SEGMEN.includes(body.segment)) return Response.json({ success: false, message: "Segmen gak valid." }, { status: 400 });
    const template = String(body.message || "").trim();
    if (template.length < 15 || template.length > 700) {
      return Response.json({ success: false, message: "Pesan harus 15–700 karakter." }, { status: 400 });
    }

    const penerima = filterSegmen(pelanggan, body.segment).slice(0, MAX_PER_BLAST);
    if (penerima.length === 0) return Response.json({ success: false, message: "Belum ada penerima di segmen ini." }, { status: 400 });

    // Klaim cooldown 24 jam secara ATOMIK: UPDATE cuma berhasil kalau
    // wa_last_blast_at masih di luar window cooldown PADA SAAT row di-lock
    // oleh Postgres, jadi gak ada celah antara "cek" dan "catat" kayak sebelumnya.
    const now = new Date();
    const cutoff = new Date(now.getTime() - COOLDOWN_MS).toISOString();
    const { data: klaim, error: errKlaim } = await supabaseAdmin.from("stores")
      .update({ wa_last_blast_at: now.toISOString() })
      .eq("id", store.id)
      .lt("wa_last_blast_at", cutoff)
      .select("id")
      .maybeSingle();
    if (errKlaim) return Response.json({ success: false, message: "Gagal klaim slot blast: " + errKlaim.message }, { status: 500 });
    if (!klaim) {
      // Kalah race (atau emang masih cooldown) -> gak boleh lanjut.
      return Response.json({ success: false, message: "Blast dibatasi 1x per 24 jam per toko biar nomor pengirim aman.", bisaKirimLagiPada }, { status: 429 });
    }

    // Catatan histori blast (segmen, pesan, jumlah penerima) -- terpisah dari
    // klaim cooldown di atas, jadi gak ikut nambah risiko race lagi.
    const { data: catatan, error: errCatat } = await supabaseAdmin.from("wa_blasts")
      .insert({ store_id: store.id, segment: body.segment, message: template, total_recipients: penerima.length })
      .select("id").single();
    if (errCatat) {
      await supabaseAdmin.from("stores").update({ wa_last_blast_at: store.wa_last_blast_at }).eq("id", store.id);
      return Response.json({ success: false, message: "Gagal mencatat blast: " + errCatat.message }, { status: 500 });
    }

    const targets = penerima.map((p) => `${p.phone}|${p.nama}|${store.slug}/${p.phone}/${buatSigOptout(store.id, p.phone)}`);
    const hasil = await kirimFonnte({ targets, message: susunPesan(template, store) });

    if (!hasil.ok) {
      // Kirim gagal beneran (bukan masalah cooldown) -> jangan hukum seller
      // nunggu 24 jam buat nyoba lagi. Balikin wa_last_blast_at ke nilai lama
      // dan hapus catatan histori yang kadung dibuat.
      await supabaseAdmin.from("stores").update({ wa_last_blast_at: store.wa_last_blast_at }).eq("id", store.id);
      await supabaseAdmin.from("wa_blasts").delete().eq("id", catatan.id);
      console.error("WA blast gagal:", hasil.detail);
      return Response.json({ success: false, message: "Fonnte menolak: " + (hasil.detail || "cek status device & kuota") }, { status: 502 });
    }
    return Response.json({ success: true, terkirim: penerima.length });
  } catch (e) {
    console.error("WA blast error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan server." }, { status: 500 });
  }
}
