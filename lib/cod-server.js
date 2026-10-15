import { kembalikanStok } from "@/lib/stock-server";
import { kirimPush } from "@/lib/push-server";

// ======================================================================
// Logika bersama buat order COD (Cash on Delivery). Cuma boleh diimport dari
// kode server (API route) — pakai service role.
//
// COD = metode bayar. Status order TIDAK PERNAH "paid":
//   cod      -> order dibuat, seller belum kirim
//   shipped  -> sudah diserahkan ke ekspedisi (resi diisi), BELUM dibayar
//   selesai  -> kurir sudah nagih & uang COD dibayar (cod_paid_at terisi)
//   gagal    -> dibatalkan seller / ditolak pembeli (stok dikembalikan)
// ======================================================================

const rupiah = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");

function ringkasan(rows) {
  const first = rows[0];
  return rows.length <= 1 ? first.product_name : `${first.product_name} + ${rows.length - 1} produk lainnya`;
}

export function totalGrup(rows) {
  return rows.reduce((s, r) => s + Number(r.total_price || 0), 0);
}

// Verifikasi seller dari header Authorization: Bearer <access_token>.
// Toko selalu diturunkan dari sesi login, bukan dari body request.
export async function autentikasiSeller(supabaseAdmin, request) {
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return { error: Response.json({ success: false, message: "Belum login." }, { status: 401 }) };

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) {
    return { error: Response.json({ success: false, message: "Sesi login gak valid, coba login ulang." }, { status: 401 }) };
  }
  const { data: store } = await supabaseAdmin.from("stores").select("id, name").eq("user_id", userData.user.id).maybeSingle();
  if (!store) return { error: Response.json({ success: false, message: "Kamu belum punya toko." }, { status: 404 }) };
  return { store };
}

// Ambil semua baris order 1 transaksi COD (1 transaksi = banyak baris produk).
export async function ambilGrupCod(supabaseAdmin, midtransOrderId) {
  const { data: rows } = await supabaseAdmin
    .from("orders").select("*")
    .eq("midtrans_order_id", midtransOrderId).eq("payment_method", "cod");
  return rows || [];
}

// COD lunas: kurir udah nagih & uang dibayar pembeli -> order selesai.
// Idempotent: update dijaga .eq("status","shipped"), jadi webhook yang dikirim
// ulang gak bikin notifikasi dobel.
export async function tandaiCodLunas(supabaseAdmin, midtransOrderId, sumber) {
  const sekarang = new Date().toISOString();
  const { data: updated } = await supabaseAdmin
    .from("orders")
    .update({ status: "selesai", cod_paid_at: sekarang, cod_paid_source: sumber, completed_at: sekarang })
    .eq("midtrans_order_id", midtransOrderId)
    .eq("payment_method", "cod")
    .eq("status", "shipped")
    .select();

  if (!updated || updated.length === 0) return { updated: false };

  const first = updated[0];
  const total = totalGrup(updated);
  await supabaseAdmin.from("notifications").insert({
    store_id: first.store_id,
    order_id: first.id,
    type: "cod_paid",
    title: "COD lunas",
    message: `Pembayaran COD ${rupiah(total)} untuk ${ringkasan(updated)} dari ${first.buyer_name} sudah diterima. Pesanan selesai.`,
  });
  try {
    await kirimPush(supabaseAdmin, first.store_id, {
      title: "COD lunas ✅",
      message: `${rupiah(total)} dari ${first.buyer_name} untuk ${ringkasan(updated)}.`,
      url: "/dashboard/pesanan",
      orderId: first.id,
    });
  } catch (e) {
    console.error("Gagal kirim push COD lunas:", e.message);
  }
  return { updated: true, rows: updated };
}

// COD dibatalkan seller / ditolak pembeli di depan pintu -> stok dikembalikan.
// Update dijaga status cod/shipped, jadi stok cuma dikembalikan SEKALI.
export async function batalkanCod(supabaseAdmin, midtransOrderId, alasan) {
  const { data: updated } = await supabaseAdmin
    .from("orders")
    .update({ status: "gagal" })
    .eq("midtrans_order_id", midtransOrderId)
    .eq("payment_method", "cod")
    .in("status", ["cod", "shipped"])
    .select();

  if (!updated || updated.length === 0) return { updated: false };

  for (const r of updated) {
    await kembalikanStok(supabaseAdmin, r.product_id, r.variant_name, r.quantity);
  }

  const first = updated[0];
  await supabaseAdmin.from("notifications").insert({
    store_id: first.store_id,
    order_id: first.id,
    type: "cod_batal",
    title: "Pesanan COD dibatalkan",
    message: `Pesanan COD ${ringkasan(updated)} dari ${first.buyer_name} dibatalkan (${alasan}). Stok dikembalikan.`,
  });
  return { updated: true, rows: updated };
}
