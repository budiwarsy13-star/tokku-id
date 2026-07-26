export async function POST(request) {
  const body = await request.json();
  const { origin, destination, weight } = body;

  const params = new URLSearchParams();
  params.append("origin", origin);
  params.append("destination", destination);
  params.append("weight", weight);
  params.append("courier", "jne:jnt:sicepat:anteraja:pos");
  params.append("price", "lowest");

  const res = await fetch("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost", {
    method: "POST",
    headers: {
      key: process.env.RAJAONGKIR_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await res.json();
  return Response.json(data);
}