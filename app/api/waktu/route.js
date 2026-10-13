// Jam server — dipakai halaman toko buat nyinkronin countdown promo/flash sale.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
