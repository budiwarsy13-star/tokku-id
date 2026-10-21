import { kirimPesanWA, SITE_URL } from "@/lib/wa-server";
import { isPro, BATAS_FREE } from "@/lib/plans";
import { pakaiKuota } from "@/lib/plan-server";

// Notifikasi WhatsApp transaksional. Server-only (service role). DIPANGGIL LANGSUNG dari kode
// server (checkout, webhook Midtrans, COD) — bukan lewat HTTP publik, jadi gak bisa dipanggil
// orang luar buat spam. Satu-satunya jalur HTTP: /api/wa/notify (login seller, status_update).
//
// Semua notifikasi mengikuti switch toko `wa_notif_enabled` (Pengaturan > Notifikasi WhatsApp),
// jadi toko yang mematikannya tidak menimbulkan biaya pengiriman.
//
// Tipe:
//   order_masuk         -> ke SELLER (nomor wa_number toko): ada pesanan baru / pembayaran masuk
//   order_created_buyer -> ke BUYER: konfirmasi pesanan COD dibuat (order online sudah lewat Midtrans)
//   status_update       -> ke BUYER: pesanan dikirim / selesai (1x per status, aman dipanggil ulang)

const rupiah = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");

export async function kirimNotifWA(admin, { type, orderId }) {
  const { data: order } = await admin.from("orders")
    .select("*, stores(name, wa_number, wa_notif_enabled, plan, plan_expires_at)").eq("id", orderId).maybeSingle();
  if (!order) return { sent: false, reason: "order tidak ditemukan" };

  const store = order.stores;
  if (!store?.wa_notif_enabled) return { sent: false, reason: "notifikasi WA toko nonaktif" };

  // Paket Gratis: kuota bulanan (BATAS_FREE.notifWaSellerPerBulan) untuk SEMUA WA dari nomor platform
  // (ke seller & ke pembeli) karena tiap pesan berbiaya. Pro: tanpa batas. status_update bersifat idempotent,
  // jadi kuota dipakai SETELAH klaim berhasil (lihat di bawah) supaya klik ulang gak menghabiskan kuota.
  const bolehKirim = async (kunci) =>
    isPro(store) || (await pakaiKuota(admin, order.store_id, kunci, BATAS_FREE.notifWaSellerPerBulan));

  // 1 transaksi = beberapa baris order -> total digabung.
  const { data: rows } = await admin.from("orders").select("total_price").eq("midtrans_order_id", order.midtrans_order_id);
  const total = (rows || [order]).reduce((s, r) => s + Number(r.total_price || 0), 0);

  const kode = order.midtrans_order_id;
  const nama = order.buyer_name || "Pembeli";
  const toko = store.name || "Toko";
  const cod = order.payment_method === "cod";
  const linkLacak = `${SITE_URL}/lacak?order=${encodeURIComponent(kode)}`;

  if (type === "order_masuk") {
    if (!store.wa_number) return { sent: false, reason: "toko belum isi nomor WA" };
    if (!(await bolehKirim("notif_wa_seller"))) return { sent: false, reason: "kuota WA bulan ini habis (paket Gratis)" };
    const hasil = await kirimPesanWA(store.wa_number,
      `🛍️ *Pesanan Baru!*\n\n` +
      `Order ID: *${kode}*\nPembeli: ${nama}\nTotal: *${rupiah(total)}*\n` +
      `Metode bayar: ${cod ? "COD (bayar ke kurir)" : "Transfer/Online (sudah dibayar)"}\n\n` +
      (cod ? `Segera kirim lewat layanan COD ekspedisi & isi nomor resi di dashboard.` : `Cek dashboard Tokku.id untuk memproses pesanan.`));
    return { sent: hasil.ok, reason: hasil.detail };
  }

  if (type === "order_created_buyer") {
    if (!cod || !order.buyer_phone) return { sent: false, reason: "bukan COD / tanpa nomor" };
    if (!(await bolehKirim("notif_wa_buyer"))) return { sent: false, reason: "kuota WA bulan ini habis (paket Gratis)" };
    const hasil = await kirimPesanWA(order.buyer_phone,
      `Halo ${nama}! 👋\n\nPesanan COD kamu di *${toko}* berhasil dibuat.\n` +
      `Order ID: *${kode}*\nTotal: *${rupiah(total)}*\n\n` +
      `Pembayaran: *COD* — bayar ke kurir saat paket tiba ya. Kami kabari kalau sudah dikirim 📦\n\n` +
      `Pantau pesanan: ${linkLacak}`);
    return { sent: hasil.ok, reason: hasil.detail };
  }

  if (type === "status_update") {
    if (!order.buyer_phone) return { sent: false, reason: "tanpa nomor" };
    const status = order.status;
    if (status !== "shipped" && status !== "selesai") return { sent: false, reason: "status tidak perlu notifikasi" };

    // Klaim dulu (update bersyarat) -> request ganda/seller klik berulang gak bikin WA dobel.
    const { data: klaim } = await admin.from("orders").update({ wa_status_notified: status })
      .eq("midtrans_order_id", kode).or(`wa_status_notified.is.null,wa_status_notified.neq.${status}`).select("id");
    if (!klaim || klaim.length === 0) return { sent: false, reason: "sudah pernah dikirim" };
    if (!(await bolehKirim("notif_wa_buyer"))) {
      await admin.from("orders").update({ wa_status_notified: null }).eq("midtrans_order_id", kode).eq("wa_status_notified", status);
      return { sent: false, reason: "kuota WA bulan ini habis (paket Gratis)" };
    }

    let pesan;
    if (status === "shipped") {
      pesan =
        `📦 *Pesanan Dikirim!*\n\nHalo ${nama}! Pesananmu dari *${toko}* sudah dikirim.\nOrder ID: *${kode}*\n` +
        (order.waybill_number ? `No. resi: *${order.waybill_number}*\nKurir: ${order.courier_name || order.courier || "-"}\n` : "") +
        (cod ? `\n💵 *COD:* siapkan *${rupiah(total)}* untuk dibayar ke kurir saat paket tiba (tidak perlu buka paket dulu).\n` : "") +
        `\nPantau pesanan: ${linkLacak}`;
    } else {
      pesan =
        `✅ *Pesanan Selesai!*\n\nHalo ${nama}! Pesananmu dari *${toko}* sudah selesai.\nOrder ID: *${kode}*\n\n` +
        `Terima kasih sudah belanja! Kalau ada kendala, hubungi toko lewat halaman pesananmu: ${linkLacak}`;
    }
    const hasil = await kirimPesanWA(order.buyer_phone, pesan);
    if (!hasil.ok) {
      // Gagal kirim -> lepas klaim supaya bisa dicoba lagi.
      await admin.from("orders").update({ wa_status_notified: null }).eq("midtrans_order_id", kode).eq("wa_status_notified", status);
    }
    return { sent: hasil.ok, reason: hasil.detail };
  }

  return { sent: false, reason: "tipe tidak dikenal" };
}
