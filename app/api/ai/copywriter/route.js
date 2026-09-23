// app/api/ai/copywriter/route.js
import { createClient } from "@supabase/supabase-js";
import { cekRateLimit } from "@/lib/rate-limit-server";
import { generateCopywriting } from "@/lib/copywriter-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Wajib login — endpoint ini manggil Claude API yang berbayar per
    // pemakaian, jadi gak boleh bisa dipanggil orang anonim/bot.
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return Response.json({ success: false, message: "Belum login." }, { status: 401 });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return Response.json({ success: false, message: "Sesi login gak valid." }, { status: 401 });
    }

    // Rate limit per user — nyegah 1 akun spam klik generate dan bikin
    // tagihan API meledak. 10x/menit udah lebih dari cukup buat pemakaian wajar.
    const rl = await cekRateLimit(supabaseAdmin, `ai_copywriter:${userData.user.id}`, 10);
    if (!rl.allowed) {
      return Response.json({ success: false, message: "Kebanyakan generate, tunggu sebentar ya." }, { status: 429 });
    }

    const { name, category, notes, imageUrl } = await request.json();
    if (!name || !name.trim()) {
      return Response.json({ success: false, message: "Nama produk wajib diisi dulu sebelum generate." }, { status: 400 });
    }

    const hasil = await generateCopywriting({
      name: name.trim().slice(0, 200),
      category: (category || "").trim().slice(0, 100),
      notes: (notes || "").trim().slice(0, 500),
      imageUrl: imageUrl || null,
    });

    return Response.json({ success: true, hasil });
  } catch (error) {
    console.error("AI copywriter error:", error);
    return Response.json({ success: false, message: error.message || "Gagal generate, coba lagi." }, { status: 500 });
  }
}
