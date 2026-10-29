import { dengan, balas } from "@/lib/admin-http";
import { validasiId, maskNama, maskTelepon, maskEmail, catatAudit } from "@/lib/admin-server";
import { akhirPaketAktif } from "@/lib/admin-aksi";

export const GET = dengan({ izin: "seller.baca" }, async ({ params, db, admin, ip, ua }) => {
  const id = validasiId(params.id);
  if (!id) return balas({ success: false, kode: "INPUT", message: "ID tidak valid." }, 400);
  // Kolom DITULIS EKSPLISIT: store_secrets (token Meta/GA4) sengaja tidak pernah disentuh panel admin.
  const { data: toko } = await db.from("stores").select("id, name, slug, plan, plan_expires_at, plan_aktif_sampai, status, is_verified, total_success_orders, created_at, user_id, wa_number").eq("id", id).maybeSingle();
  if (!toko) return balas({ success: false, kode: "TIDAK_ADA", message: "Toko tidak ditemukan." }, 404);

  const [orders, kom, ret, ledger, langganan, keu] = await Promise.all([
    db.from("orders").select("id, midtrans_order_id, product_name, variant_name, quantity, total_price, shipping_cost, status, payment_method, cod_paid_at, buyer_name, buyer_phone, destination_label, courier, created_at, paid_at, ref_source").eq("store_id", id).order("created_at", { ascending: false }).limit(40),
    db.from("complaints").select("*").eq("store_id", id).order("created_at", { ascending: false }).limit(30),
    db.from("order_returns").select("*").eq("store_id", id).order("created_at", { ascending: false }).limit(30),
    db.from("seller_ledger").select("id, kind, amount, reference, note, created_at").eq("store_id", id).order("id", { ascending: false }).limit(40),
    db.from("plan_payments").select("order_id, provider, period_months, amount, status, created_at, paid_at").eq("store_id", id).order("created_at", { ascending: false }).limit(20),
    db.rpc("admin_keuangan", { p_store: id }),
  ]);
  const kasusId = (rows) => (rows.data || []).map((r) => String(r.id));
  const [cKom, cRet] = await Promise.all([
    db.from("admin_cases").select("case_id, status, note").eq("kind", "komplain").in("case_id", kasusId(kom).length ? kasusId(kom) : ["-"]),
    db.from("admin_cases").select("case_id, status, note").eq("kind", "retur").in("case_id", kasusId(ret).length ? kasusId(ret) : ["-"]),
  ]);
  const peta = (c) => new Map((c.data || []).map((x) => [x.case_id, x]));
  const pK = peta(cKom), pR = peta(cRet);
  const kasus = (jenis, rows, pt) => (rows.data || []).map((r) => ({
    jenis, id: r.id, orderId: r.order_id, nama: maskNama(r.buyer_name), telepon: maskTelepon(r.buyer_phone),
    alasan: r.type || r.reason || "", deskripsi: r.description || "", mintaCs: !!r.involves_cs, dibuat: r.created_at,
    status: pt.get(String(r.id))?.status || "baru", catatan: pt.get(String(r.id))?.note || "",
  }));

  let emailOwner = "";
  try { emailOwner = (await db.auth.admin.getUserById(toko.user_id)).data?.user?.email || ""; } catch { /* kosong */ }

  // Membuka profil seller = tercatat (best-effort; pembukaan data pribadi penuh lewat /api/admin/pii wajib tercatat).
  try { await catatAudit(db, { admin, aksi: "seller.lihat", targetType: "store", targetId: id, ip, ua }); } catch (e) { console.error(e.message); }

  const akhir = akhirPaketAktif(toko, Date.now());
  const { user_id: _u, wa_number, ...tokoAman } = toko;
  return balas({
    success: true,
    toko: { ...tokoAman, paketAktif: akhir > 0, paketSampai: akhir > 0 ? new Date(akhir).toISOString() : null, emailOwner: maskEmail(emailOwner), telepon: maskTelepon(wa_number) },
    keuangan: keu.data?.[0] || null,
    langganan: langganan.data || [],
    ledger: ledger.data || [],
    kasus: [...kasus("komplain", kom, pK), ...kasus("retur", ret, pR)].sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat))),
    pesanan: (orders.data || []).map((o) => ({ ...o, buyer_name: maskNama(o.buyer_name), buyer_phone: maskTelepon(o.buyer_phone) })),
  });
});
