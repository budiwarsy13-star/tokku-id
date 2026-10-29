import { dengan, balas } from "@/lib/admin-http";
import { pilihan } from "@/lib/admin-server";
import { ambilKasusTerbuka } from "@/lib/admin-data";

export const GET = dengan({ izin: "ringkasan.baca" }, async ({ request, db }) => {
  const hari = Number(pilihan(new URL(request.url).searchParams.get("hari"), ["7", "30", "90"], "30"));
  const [r, t, p, l] = await Promise.all([
    db.rpc("admin_ringkasan"),
    db.rpc("admin_traffic_harian", { p_hari: hari }),
    db.rpc("admin_penjualan_harian", { p_hari: hari }),
    db.rpc("admin_langganan_ringkasan"),
  ]);
  for (const x of [r, t, p, l]) if (x.error) throw new Error(x.error.message);
  const kasus = await ambilKasusTerbuka(db);
  return balas({ success: true, hari, ringkasan: r.data, traffic: t.data, penjualan: p.data, langganan: l.data, kasus });
});
