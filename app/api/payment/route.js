// Route ini SENGAJA dinonaktifkan. Pembuatan transaksi pembayaran sekarang
// HARUS lewat /api/checkout, yang menghitung ulang harga/ongkir/diskon dari
// database sendiri — bukan percaya begitu aja ke angka yang dikirim client.
//
// Route lama ini dulu nerima `amount` & `items` mentah-mentah dari body
// request tanpa validasi apapun, artinya siapapun bisa modif harga lewat
// DevTools/curl sebelum bikin transaksi. Daripada dihapus (bisa bikin bingung
// kalau ada kode lama yang masih manggil), route ini sengaja dibiarkan ada
// tapi langsung nolak semua request.
export async function POST() {
  return Response.json(
    { error: "Endpoint ini udah gak dipakai. Gunakan /api/checkout." },
    { status: 410 }
  );
}
