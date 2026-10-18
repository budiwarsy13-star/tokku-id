import midtransClient from "midtrans-client";

// Snap Midtrans untuk tagihan LANGGANAN tokku (uang masuk ke akun Midtrans platform,
// BUKAN dana seller). Webhook-nya ditangani cabang "SUB-" di /api/midtrans/notification.
export async function buatTagihanMidtrans({ orderId, amount, deskripsi, email, nama }) {
  const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY,
  });
  const trx = await snap.createTransaction({
    transaction_details: { order_id: orderId, gross_amount: amount },
    item_details: [{ id: "PLAN-PRO", price: amount, quantity: 1, name: String(deskripsi).slice(0, 50) }],
    customer_details: { first_name: String(nama || "Seller").slice(0, 40), email: email || undefined },
    expiry: { unit: "hour", duration: 24 },
  });
  return { provider: "midtrans", token: trx.token, redirectUrl: trx.redirect_url };
}
