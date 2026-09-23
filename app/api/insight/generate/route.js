// app/api/insight/generate/route.js
//
// Trigger manual buat seller nge-generate insight kapan aja (dipakai tombol
// "Generate sekarang" di dashboard), gak perlu nunggu cron Senin pagi —
// penting buat testing & buat seller yang penasaran di luar jadwal.
//
// Ada cooldown 1 jam per toko biar gak dipencet berkali-kali dan bikin
// tagihan Claude API boros percuma (beda dari rate limit per-request biasa,
// ini ngecek kapan insight TERAKHIR beneran berhasil dibuat).

import { createClient } from "@supabase/supabase-js";
import { generateInsightMingguan } from "@/lib/insight-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COOLDOWN_MS = 60 * 60 * 1000; // 1 jam

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return Response.json({ success: false, message: "Belum login." }, { status: 401 });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return Response.json({ success: false, message: "Sesi login gak valid." }, { status: 401 });
    }

    // storeId SELALU dari akun yang login, bukan dari body — pola yang sama
    // kayak bulk-import, biar gak bisa generate/liat insight toko orang lain.
    const { data: store } = await supabaseAdmin
      .from("stores").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (!store) return Response.json({ success: false, message: "Kamu belum punya toko." }, { status: 404 });

    const { data: terakhir } = await supabaseAdmin
      .from("ai_insights")
      .select("created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (terakhir && Date.now() - new Date(terakhir.created_at).getTime() < COOLDOWN_MS) {
      const sisaMenit = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(terakhir.created_at).getTime())) / 60000);
      return Response.json(
        { success: false, message: `Baru aja generate insight. Coba lagi ${sisaMenit} menit lagi.` },
        { status: 429 }
      );
    }

    const insight = await generateInsightMingguan(supabaseAdmin, store.id);
    return Response.json({ success: true, insight });
  } catch (error) {
    console.error("Manual insight generate error:", error);
    return Response.json({ success: false, message: error.message || "Gagal generate insight." }, { status: 500 });
  }
}
