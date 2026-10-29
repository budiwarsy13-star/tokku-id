import { dengan, balas } from "@/lib/admin-http";
import { pilihan } from "@/lib/admin-server";
import { halaman } from "@/lib/admin-data";

const PER_HAL = 25;
export const GET = dengan({ izin: "seller.baca" }, async ({ request, db }) => {
  const sp = new URL(request.url).searchParams;
  const q = String(sp.get("q") || "").replace(/[%_\\]/g, "").trim().slice(0, 60); // tanpa wildcard
  const plan = pilihan(sp.get("plan"), ["pro", "free"], "");
  const status = pilihan(sp.get("status"), ["active", "suspended"], "");
  const hal = halaman(sp.get("hal"));
  const { data, error } = await db.rpc("admin_seller_list", { p_q: q || null, p_plan: plan || null, p_status: status || null, p_limit: PER_HAL, p_offset: (hal - 1) * PER_HAL });
  if (error) throw new Error(error.message);
  const total = data?.[0]?.total ?? 0;
  return balas({ success: true, hal, perHal: PER_HAL, total: Number(total), seller: (data || []).map(({ total: _t, ...s }) => s) });
});
