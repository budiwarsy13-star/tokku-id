import { dengan, balas } from "@/lib/admin-http";
import { pilihan, maskNama, maskTelepon } from "@/lib/admin-server";
import { halaman } from "@/lib/admin-data";

const PER_HAL = 25, AMBIL = 300;
export const GET = dengan({ izin: "komplain.baca" }, async ({ request, db }) => {
  const sp = new URL(request.url).searchParams;
  const jenis = pilihan(sp.get("jenis"), ["komplain", "retur"], "");
  const status = pilihan(sp.get("status"), ["baru", "diproses", "selesai", "ditolak", "semua"], "baru");
  const hal = halaman(sp.get("hal"));

  const [kom, ret, cs] = await Promise.all([
    jenis === "retur" ? { data: [] } : db.from("complaints").select("*").order("created_at", { ascending: false }).limit(AMBIL),
    jenis === "komplain" ? { data: [] } : db.from("order_returns").select("*").order("created_at", { ascending: false }).limit(AMBIL),
    db.from("admin_cases").select("kind, case_id, status, note").limit(10000),
  ]);
  for (const x of [kom, ret, cs]) if (x.error) throw new Error(x.error.message);
  const keputusan = new Map((cs.data || []).map((c) => [`${c.kind}:${c.case_id}`, c]));
  const semua = [
    ...(kom.data || []).map((r) => ({ jenis: "komplain", r })),
    ...(ret.data || []).map((r) => ({ jenis: "retur", r })),
  ].map(({ jenis: j, r }) => {
    const k = keputusan.get(`${j}:${r.id}`);
    return {
      jenis: j, id: r.id, orderId: r.order_id, storeId: r.store_id, nama: maskNama(r.buyer_name), telepon: maskTelepon(r.buyer_phone),
      alasan: r.type || r.reason || "", deskripsi: r.description || "", mintaCs: !!r.involves_cs, dibuat: r.created_at,
      status: k?.status || "baru", catatan: k?.note || "",
    };
  }).filter((x) => status === "semua" || x.status === status)
    .sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));

  const total = semua.length;
  const baris = semua.slice((hal - 1) * PER_HAL, hal * PER_HAL);
  const ids = [...new Set(baris.map((b) => b.storeId).filter(Boolean))];
  const { data: toko } = ids.length ? await db.from("stores").select("id, name, slug").in("id", ids) : { data: [] };
  const namaToko = new Map((toko || []).map((t) => [String(t.id), t]));
  return balas({
    success: true, hal, perHal: PER_HAL, total,
    terpotong: (kom.data || []).length >= AMBIL || (ret.data || []).length >= AMBIL,
    kasus: baris.map((b) => ({ ...b, toko: namaToko.get(String(b.storeId))?.name || "-", slug: namaToko.get(String(b.storeId))?.slug || "" })),
  });
});
