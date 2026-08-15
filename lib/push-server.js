import webpush from "web-push";

// PENTING: file ini cuma boleh diimport dari kode server (API routes, webhook, cron).
// Jangan pernah diimport dari komponen client — VAPID_PRIVATE_KEY harus tetap rahasia.

let dikonfigurasi = false;
function pastikanKonfigurasi() {
  if (dikonfigurasi) return;
  webpush.setVapidDetails(
    "mailto:admin@tokku.id",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  dikonfigurasi = true;
}

// Kirim push ke semua device yang subscribe buat 1 toko tertentu.
// `supabaseAdmin` di-pass dari pemanggil (butuh service role key buat baca semua subscription).
export async function kirimPush(supabaseAdmin, storeId, { title, message, url, orderId }) {
  pastikanKonfigurasi();

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("store_id", storeId);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, message, url: url || "/dashboard", orderId });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        // Kode 410 (Gone) / 404 artinya subscription-nya udah gak valid lagi
        // (user uninstall, clear data, dll) — bersihin dari database.
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Gagal kirim push:", err.message);
        }
      }
    })
  );
}
