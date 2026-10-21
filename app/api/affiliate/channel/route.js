import { MAX_CHANNELS } from "@/lib/affiliate-config";
import { supabaseAdmin, autentikasiAffiliate, validasiChannel } from "@/lib/affiliate-server";

// Tambah channel sosmed baru (setelah pendaftaran selesai).
// Tiap channel dapet ref_code sendiri -> asal komisi bisa dibedain per channel.
export async function POST(request) {
  try {
    const auth = await autentikasiAffiliate(request, { harusAktif: true });
    if (auth.error) return auth.error;
    const { affiliate } = auth;

    const { data: ada } = await supabaseAdmin.from("affiliate_channels")
      .select("platform, handle").eq("affiliate_id", affiliate.id);
    if ((ada || []).length >= MAX_CHANNELS) {
      return Response.json({ success: false, message: `Maksimal ${MAX_CHANNELS} channel.` }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const urutan = (ada || []).filter((c) => c.platform === body.platform).length + 1;
    const hasil = validasiChannel(body, affiliate.username, urutan);
    if (hasil.error) return Response.json({ success: false, message: hasil.error }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("affiliate_channels")
      .insert({ affiliate_id: affiliate.id, ...hasil.data }).select("*").single();
    if (error) {
      if (error.code === "23505") return Response.json({ success: false, message: "Channel ini sudah terdaftar." }, { status: 409 });
      console.error("Tambah channel error:", error);
      return Response.json({ success: false, message: "Gagal menambah channel." }, { status: 500 });
    }
    return Response.json({ success: true, channel: { id: data.id, refCode: data.ref_code, kodeVerifikasi: data.verify_code } });
  } catch (e) {
    console.error("Affiliate channel error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}

// Nonaktifkan channel (bukan hapus): ref_code-nya tetap tercatat biar riwayat
// komisi dari channel itu gak hilang.
export async function DELETE(request) {
  try {
    const auth = await autentikasiAffiliate(request, { harusAktif: true });
    if (auth.error) return auth.error;
    const { id } = await request.json().catch(() => ({}));
    if (!id) return Response.json({ success: false, message: "ID channel wajib." }, { status: 400 });

    const { data: aktif } = await supabaseAdmin.from("affiliate_channels")
      .select("id").eq("affiliate_id", auth.affiliate.id).eq("is_active", true);
    if ((aktif || []).length <= 1 && (aktif || []).some((c) => c.id === id)) {
      return Response.json({ success: false, message: "Minimal harus ada 1 channel aktif." }, { status: 400 });
    }
    const { data } = await supabaseAdmin.from("affiliate_channels")
      .update({ is_active: false }).eq("id", id).eq("affiliate_id", auth.affiliate.id).select("id");
    if (!data || data.length === 0) return Response.json({ success: false, message: "Channel gak ditemukan." }, { status: 404 });
    return Response.json({ success: true });
  } catch (e) {
    console.error("Affiliate channel hapus error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
