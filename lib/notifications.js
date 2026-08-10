// Helper buat bikin notifikasi. Dipakai dari client (browser, pakai anon key)
// maupun dari server (webhook, pakai service role key lewat supabaseAdmin).
//
// `client` = instance supabase yang dipakai (bisa `supabase` biasa dari lib/supabase.js
// kalau dipanggil dari browser, atau supabaseAdmin kalau dipanggil dari API route server-side).

export async function buatNotifikasi(client, { storeId, orderId = null, type, title, message }) {
  const { error } = await client.from("notifications").insert({
    store_id: storeId,
    order_id: orderId,
    type,
    title,
    message,
  });
  if (error) console.error("Gagal bikin notifikasi:", error.message);
}

export const NOTIF_TEMPLATES = {
  orderMasuk: (productName, buyerName) => ({
    type: "order_masuk",
    title: "Pesanan baru masuk",
    message: `${buyerName} memesan ${productName}. Menunggu pembayaran.`,
  }),
  pembayaranMasuk: (productName, totalPrice) => ({
    type: "pembayaran_masuk",
    title: "Pembayaran diterima",
    message: `Pembayaran untuk ${productName} sebesar Rp${Number(totalPrice).toLocaleString("id-ID")} sudah masuk.`,
  }),
  orderPending: (productName, buyerName) => ({
    type: "order_pending",
    title: "Pesanan harus segera dikirim",
    message: `Pesanan ${productName} dari ${buyerName} sudah dibayar lebih dari 24 jam dan belum dikirim.`,
  }),
  deliveryUpdate: (productName) => ({
    type: "delivery_update",
    title: "Status pengiriman diperbarui",
    message: `Pesanan ${productName} sudah ditandai dikirim.`,
  }),
  pesananSelesai: (productName) => ({
    type: "pesanan_selesai",
    title: "Pesanan selesai",
    message: `Pesanan ${productName} sudah ditandai selesai diterima pembeli.`,
  }),
};
