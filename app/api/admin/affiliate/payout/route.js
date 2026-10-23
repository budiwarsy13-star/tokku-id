import { supabaseAdmin, dekripsi, samaAman } from "@/lib/affiliate-server";

// ADMIN ONLY. Dipakai admin tokku buat transfer komisi affiliate tiap minggu.
// Dilindungi header  Authorization: Bearer <ADMIN_SECRET>  (env ADMIN_SECRET,
// SENGAJA beda dari CRON_SECRET karena endpoint ini membuka nomor rekening).
//
//  GET  /api/admin/affiliate/payout?status=menunggu            -> daftar batch (JSON)
//  GET  /api/admin/affiliate/payout?status=menunggu&format=csv -> CSV siap dipakai transfer massal
//  POST /api/admin/affiliate/payout  { "payoutId": "...", "referensi": "TRX123" }
//       -> tandai batch sudah ditransfer (komisi di dalamnya jadi "dibayar")

function cekAdmin(request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return Response.json({ error: "ADMIN_SECRET belum diatur." }, { status: 503 });
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!samaAman(token, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

// Cegah formula injection kalau CSV dibuka di Excel/Sheets.
const sel = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(request) {
  const tolak = cekAdmin(request); if (tolak) return tolak;
  try {
    const url = new URL(request.url);
    const status = ["menunggu", "dibayar", "gagal"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "menunggu";

    const { data: payouts } = await supabaseAdmin.from("affiliate_payouts")
      .select("id, affiliate_id, total, jumlah_komisi, status, created_at, paid_at, referensi")
      .eq("status", status).order("created_at", { ascending: true }).limit(500);
    const ids = [...new Set((payouts || []).map((p) => p.affiliate_id))];
    const [{ data: aff }, { data: kyc }] = ids.length
      ? await Promise.all([
          supabaseAdmin.from("affiliates").select("id, full_name, phone, username").in("id", ids),
          supabaseAdmin.from("affiliate_kyc").select("*").in("affiliate_id", ids),
        ])
      : [{ data: [] }, { data: [] }];
    const affById = Object.fromEntries((aff || []).map((a) => [a.id, a]));
    const kycById = Object.fromEntries((kyc || []).map((k) => [k.affiliate_id, k]));

    const daftar = (payouts || []).map((p) => {
      const a = affById[p.affiliate_id] || {}; const k = kycById[p.affiliate_id] || {};
      let nomor = null;
      try { nomor = k.account_number_enc ? dekripsi(k.account_number_enc) : null; } catch { nomor = "GAGAL_DEKRIPSI"; }
      return {
        payoutId: p.id, status: p.status, total: Number(p.total), jumlahKomisi: p.jumlah_komisi,
        dibuat: p.created_at, dibayarPada: p.paid_at, referensi: p.referensi,
        nama: a.full_name, username: a.username, wa: a.phone,
        jenis: k.payout_type, penyedia: k.payout_provider, nomorRekening: nomor, namaPemilik: k.account_name,
      };
    });

    if (url.searchParams.get("format") === "csv") {
      const kepala = ["payout_id", "nama", "wa", "jenis", "penyedia", "nomor_rekening", "nama_pemilik", "jumlah", "jumlah_komisi"];
      const baris = daftar.map((d) => [d.payoutId, d.nama, d.wa, d.jenis, d.penyedia, d.nomorRekening, d.namaPemilik, d.total, d.jumlahKomisi].map(sel).join(","));
      return new Response([kepala.join(","), ...baris].join("\n"), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payout-affiliate-${status}.csv"`, "Cache-Control": "no-store" },
      });
    }
    return Response.json({ success: true, payouts: daftar }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Admin payout GET error:", e);
    return Response.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}

export async function POST(request) {
  const tolak = cekAdmin(request); if (tolak) return tolak;
  try {
    const { payoutId, referensi } = await request.json().catch(() => ({}));
    if (!payoutId) return Response.json({ error: "payoutId wajib." }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc("affiliate_tandai_payout_dibayar", {
      p_payout_id: payoutId, p_referensi: String(referensi || "").slice(0, 100),
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    if (!data) return Response.json({ error: "Batch gak ditemukan atau sudah ditandai dibayar." }, { status: 409 });
    return Response.json({ success: true });
  } catch (e) {
    console.error("Admin payout POST error:", e);
    return Response.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}
