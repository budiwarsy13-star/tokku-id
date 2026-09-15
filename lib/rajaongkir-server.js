// Helper hitung ongkir — dipakai bareng /api/rajaongkir/cost (buat preview pas
// buyer masih isi form) DAN /api/checkout (buat cocokin ULANG kurir yang
// dipilih buyer ke daftar opsi asli, gak boleh percaya angka ongkir dari client).
export async function ambilOpsiOngkir(origin, destination, weight) {
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
  return data?.data || [];
}
