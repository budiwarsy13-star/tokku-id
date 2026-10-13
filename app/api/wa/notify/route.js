// app/api/wa/notify/route.js
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const FONNTE_URL = "https://api.fonnte.com/send";

async function sendWA(to, message) {
  if (!FONNTE_TOKEN) {
    console.warn("FONNTE_TOKEN not set, skipping WA notification");
    return;
  }
  const phone = to.replace(/\D/g, "").replace(/^0/, "62");
  await fetch(FONNTE_URL, {
    method: "POST",
    headers: { Authorization: FONNTE_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ target: phone, message }),
  });
}

export async function POST(req) {
  const { type, orderId } = await req.json();

  const { data: order } = await supabase
    .from("orders")
    .select("*, stores(wa_number, wa_notif_enabled, name)")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const store = order.stores;
  const storeName = store?.name || "Toko";
  const totalFmt = `Rp${Number(order.total_price).toLocaleString("id-ID")}`;
  const buyerName = order.buyer_name || "Pembeli";
  const orderCode = order.id.slice(0, 8).toUpperCase();

  // --- Notifikasi ke Seller ---
  if (type === "order_masuk" && store?.wa_notif_enabled && store?.wa_number) {
    const msg =
      `🛍️ *Pesanan Baru Masuk!*\n\n` +
      `Kode pesanan: *${orderCode}*\n` +
      `Pembeli: ${buyerName}\n` +
      `Total: *${totalFmt}*\n` +
      `Metode bayar: ${order.payment_method === "cod" ? "COD (Bayar di tempat)" : "Transfer/Online"}\n\n` +
      `Cek di dashboard Tokku.id untuk konfirmasi pesanan.`;
    await sendWA(store.wa_number, msg);
  }

  // --- Notifikasi ke Buyer ---
  if (order.buyer_phone) {
    if (type === "order_created_buyer") {
      const isCOD = order.payment_method === "cod";
      const msg =
        `Halo ${buyerName}! 👋\n\n` +
        `Pesanan kamu di *${storeName}* berhasil dibuat.\n` +
        `Kode pesanan: *${orderCode}*\n` +
        `Total: *${totalFmt}*\n\n` +
        (isCOD
          ? `Pembayaran: *COD* — bayar saat barang tiba ya!\n\nPesananmu sedang diproses. Kami akan kabarin kalau sudah dikirim. 📦`
          : `Silakan selesaikan pembayaranmu ya!\n\nPesananmu akan diproses setelah pembayaran dikonfirmasi. 🙏`);
      await sendWA(order.buyer_phone, msg);
    }

    if (type === "status_update") {
      let msg = "";
      if (order.status === "shipped") {
        msg =
          `📦 *Pesanan Dikirim!*\n\n` +
          `Halo ${buyerName}! Pesananmu dari *${storeName}* sudah dikirim.\n` +
          `Kode pesanan: *${orderCode}*\n\n` +
          (order.tracking_number
            ? `No. resi: *${order.tracking_number}*\n` +
              `Kurir: ${order.courier_name || "-"}\n\n`
            : "") +
          `Estimasi tiba 2-5 hari kerja. Siap-siap ya! 🚚`;
      } else if (order.status === "selesai") {
        msg =
          `✅ *Pesanan Selesai!*\n\n` +
          `Halo ${buyerName}! Pesananmu dari *${storeName}* sudah selesai.\n` +
          `Kode pesanan: *${orderCode}*\n\n` +
          `Terima kasih udah belanja! Kalau ada pertanyaan, hubungi toko langsung ya. 😊`;
      }
      if (msg) await sendWA(order.buyer_phone, msg);
    }
  }

  return NextResponse.json({ ok: true });
}
