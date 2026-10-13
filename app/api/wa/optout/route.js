// Pembeli klik link "berhenti" di pesan WA -> halaman konfirmasi -> POST ke sini.
// Sengaja butuh klik konfirmasi (bukan otomatis saat link dibuka) karena WhatsApp
// & scanner link suka mem-prefetch URL.
import { createClient } from "@supabase/supabase-js";
import { ambilIp, cekRateLimit } from "@/lib/rate-limit-server";
import { sigOptoutValid, teleponValid } from "@/lib/wa-server";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { allowed } = await cekRateLimit(supabaseAdmin, `optout:${ambilIp(request)}`, 20);
    if (!allowed) return Response.json({ success: false, message: "Terlalu banyak percobaan." }, { status: 429 });

    const { slug, phone, sig } = await request.json().catch(() => ({}));
    if (!slug || !teleponValid(String(phone || ""))) return Response.json({ success: false, message: "Link gak valid." }, { status: 400 });

    const { data: store } = await supabaseAdmin.from("stores").select("id, name").eq("slug", slug).maybeSingle();
    if (!store || !sigOptoutValid(store.id, phone, sig)) {
      return Response.json({ success: false, message: "Link gak valid atau sudah kedaluwarsa." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("wa_optouts")
      .upsert({ store_id: store.id, phone }, { onConflict: "store_id,phone", ignoreDuplicates: true });
    if (error) return Response.json({ success: false, message: "Gagal menyimpan, coba lagi." }, { status: 500 });
    return Response.json({ success: true, toko: store.name });
  } catch (e) {
    console.error("Optout error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan server." }, { status: 500 });
  }
}
