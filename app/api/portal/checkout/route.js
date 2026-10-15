// Route ini SENGAJA dinonaktifkan. Dulu bikin order langsung dari browser dengan
// harga/ongkir dari client dan pakai tabel product_variants + RPC
// decrement_variant_stock yang sudah gak ada di database. Pembuatan pesanan
// sekarang HANYA lewat /api/checkout (harga, ongkir, diskon dihitung ulang di server).
const gone = () => Response.json({ error: "Endpoint ini udah gak dipakai. Gunakan /api/checkout." }, { status: 410 });
export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
