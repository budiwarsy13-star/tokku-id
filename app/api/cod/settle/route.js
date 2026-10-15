import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { ambilGrupCod, tandaiCodLunas } from "@/lib/cod-server";
import { cekRateLimit, ambilIp } from "@/lib/rate-limit-server";

// ======================================================================
// TRIGGER DARI EKSPEDISI: "uang COD paket ini sudah dibayar pembeli".
//
// Endpoint ini PENERIMA SEMENTARA dengan format generik. Begitu nanti pakai
// API ekspedisi/agregator (Biteship, dsb), sesuaikan bagian "parse payload"
// dan verifikasi signature-nya dengan format resmi penyedia itu — logika
// bisnisnya (tandaiCodLunas) tetap sama.
//
// Aktif HANYA kalau env COD_WEBHOOK_SECRET diisi. Tanpa itu endpoint nolak
// semua request (503), jadi gak bisa dipanggil orang iseng.
//
// Request:  POST  header  x-cod-secret: <COD_WEBHOOK_SECRET>
//           body  { "event": "cod_paid", "waybill_number": "JP123...", "order_id": "TOKKU-..." (opsional) }
// ======================================================================

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function secretCocok(dikirim, seharusnya) {
  const a = Buffer.from(String(dikirim || ""));
  const b = Buffer.from(String(seharusnya));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  try {
    const secret = process.env.COD_WEBHOOK_SECRET;
    if (!secret) return Response.json({ success: false, message: "Webhook COD belum diaktifkan." }, { status: 503 });

    const { allowed } = await cekRateLimit(supabaseAdmin, `cod-settle:${ambilIp(request)}`, 120);
    if (!allowed) return Response.json({ success: false, message: "Terlalu banyak request." }, { status: 429 });

    if (!secretCocok(request.headers.get("x-cod-secret"), secret)) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // --- parse payload (sesuaikan saat pakai API ekspedisi sungguhan) ---
    const body = await request.json();
    const event = String(body.event || "");
    const waybill = String(body.waybill_number || "").trim().toUpperCase();
    const orderId = body.order_id ? String(body.order_id).trim().toUpperCase() : null;

    if (event !== "cod_paid") return Response.json({ success: true, ignored: true });
    if (!waybill) return Response.json({ success: false, message: "waybill_number wajib." }, { status: 400 });

    let q = supabaseAdmin.from("orders").select("midtrans_order_id, status, cod_paid_at")
      .eq("payment_method", "cod").eq("waybill_number", waybill);
    if (orderId) q = q.eq("midtrans_order_id", orderId);
    const { data: ketemu } = await q;

    const idUnik = [...new Set((ketemu || []).map((r) => r.midtrans_order_id))];
    if (idUnik.length === 0) return Response.json({ success: false, message: "Resi COD gak ditemukan." }, { status: 404 });
    if (idUnik.length > 1) return Response.json({ success: false, message: "Resi cocok ke lebih dari 1 pesanan, kirim order_id." }, { status: 409 });

    const grup = await ambilGrupCod(supabaseAdmin, idUnik[0]);
    if (grup[0].cod_paid_at) return Response.json({ success: true, already: true }); // webhook dikirim ulang

    if (grup[0].status !== "shipped") {
      return Response.json({ success: false, message: `Status pesanan '${grup[0].status}', bukan 'shipped'.` }, { status: 409 });
    }

    const hasil = await tandaiCodLunas(supabaseAdmin, idUnik[0], "courier_webhook");
    return Response.json({ success: true, updated: hasil.updated });
  } catch (error) {
    console.error("COD settle error:", error);
    return Response.json({ success: false, message: "Terjadi kesalahan." }, { status: 500 });
  }
}
