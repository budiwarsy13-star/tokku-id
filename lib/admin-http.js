// Pembungkus SEMUA endpoint admin: autentikasi -> MFA -> izin -> handler. Tidak ada jalur lain.
// (tests/admin-guard-scan memastikan setiap route admin memakai pembungkus ini.)
//
// opsi.izin       : izin tunggal untuk endpoint GET (string) atau null (cukup admin sah).
// opsi.izinAksi   : untuk endpoint POST — peta { namaAksi: izin }. Body dibaca di sini; aksi yang
//                   tidak ada di peta ditolak, izin dicek per-aksi, handler menerima `body`.
import { periksaAkses, depsProduksi, dbAdmin, ambilIpAdmin, catatAudit } from "@/lib/admin-server";
import { punya } from "@/lib/admin-permissions";

const HEADER_AMAN = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
export function balas(body, status = 200) {
  return Response.json(body, { status, headers: HEADER_AMAN });
}

// Baca JSON body dengan batas ukuran (cegah payload raksasa).
export async function bacaBody(request, maks = 10_000) {
  const teks = await request.text();
  if (teks.length > maks) return { error: "Body terlalu besar." };
  try {
    const data = JSON.parse(teks || "{}");
    if (data === null || typeof data !== "object" || Array.isArray(data)) return { error: "Body harus berupa objek JSON." };
    return { data };
  } catch {
    return { error: "Body bukan JSON yang valid." };
  }
}

// Fabrik pembungkus. `sumber` dipasok produksi (dengan() di bawah) atau tiruan saat pengujian.
export function buatPenangan(opsi, handler, sumber) {
  const { izin = null, izinAksi = null, wajibMfa = true } = opsi;
  const tulis = !!izinAksi;
  return async function (request, ctx) {
    try {
      const { deps, db } = sumber();
      const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
      const ip = ambilIpAdmin(request.headers);
      const ua = request.headers.get("user-agent") || "";

      const hasil = await periksaAkses({ token, ip, izin: izinAksi ? null : izin, tulis, wajibMfa }, deps);
      if (!hasil.ok) {
        // Catat percobaan oleh akun yang login tapi tidak berhak (dibatasi, supaya log tak bisa dibanjiri).
        if (hasil.catat && (await deps.batasi(`admin-deny:${ip}`, 10))) {
          try {
            await catatAudit(db, {
              admin: { id: hasil.catat.userId, email: hasil.catat.email, role: null },
              aksi: "akses_ditolak", detail: { alasan: hasil.catat.alasan, jalur: new URL(request.url).pathname }, ip, ua,
            });
          } catch (e) { console.error(e.message); }
        }
        return balas({ success: false, kode: hasil.kode, message: hasil.pesan }, hasil.status);
      }

      let body = null;
      if (izinAksi) {
        const b = await bacaBody(request);
        if (b.error) return balas({ success: false, kode: "INPUT", message: b.error }, 400);
        body = b.data;
        const izinDibutuhkan = Object.prototype.hasOwnProperty.call(izinAksi, body.aksi) ? izinAksi[body.aksi] : undefined;
        if (!izinDibutuhkan) return balas({ success: false, kode: "INPUT", message: "Aksi tidak dikenal." }, 400);
        if (!punya(hasil.admin.role, izinDibutuhkan)) {
          try {
            if (await deps.batasi(`admin-deny:${ip}`, 10)) {
              await catatAudit(db, { admin: hasil.admin, aksi: "akses_ditolak", detail: { alasan: `izin_${izinDibutuhkan}`, aksi: body.aksi, jalur: new URL(request.url).pathname }, ip, ua });
            }
          } catch (e) { console.error(e.message); }
          return balas({ success: false, kode: "TIDAK_PUNYA_IZIN", message: "Peranmu tidak punya izin untuk aksi ini." }, 403);
        }
      }

      const params = ctx?.params ? await ctx.params : {};
      const jawaban = await handler({ request, admin: hasil.admin, info: hasil.info, ip, ua, params, db, body });
      // Dipaksakan di sini (bukan diserahkan ke handler): tidak ada respons admin yang bisa di-cache/diindeks.
      for (const [k, v] of Object.entries(HEADER_AMAN)) jawaban.headers.set(k, v);
      return jawaban;
    } catch (e) {
      console.error("Admin API error:", e);
      return balas({ success: false, kode: "ERROR", message: "Terjadi kesalahan server." }, 500);
    }
  };
}

export function dengan(opsi, handler) {
  return buatPenangan(opsi, handler, () => ({ deps: depsProduksi(), db: dbAdmin() }));
}

// Untuk handler: ubah hasil {status, body} dari lib/admin-aksi menjadi Response.
export const kirim = ({ status, body }) => balas(body, status);
