export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");

  if (!keyword) {
    return Response.json({ data: [] });
  }

  const res = await fetch(
    `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(keyword)}&limit=10&offset=0`,
    { headers: { key: process.env.RAJAONGKIR_API_KEY } }
  );

  const data = await res.json();
  return Response.json(data);
}