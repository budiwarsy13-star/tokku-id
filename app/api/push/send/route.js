// Endpoint ini SENGAJA dihapus. /api/push/send sebelumnya adalah endpoint
// publik tanpa autentikasi — siapapun bisa kirim push notification ke toko
// manapun dengan konten apapun. Ini celah keamanan kritis.
//
// Pengganti: panggil kirimPush() LANGSUNG dari kode server yang membutuhkannya
// (webhook Midtrans, cron, konfirmasi lacak) — bukan lewat HTTP publik.
// lib/notifications.js (yang dipanggil dari browser) sudah dihapus
// pemanggilan ke endpoint ini.
export async function POST() {
  return Response.json({ error: "Endpoint ini sudah dihapus." }, { status: 410 });
}
