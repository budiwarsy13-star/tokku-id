import { dengan, balas } from "@/lib/admin-http";
import { pilihan } from "@/lib/admin-server";
import { halaman } from "@/lib/admin-data";

const PER_HAL = 25;
export const GET = dengan({ izin: "langganan.baca" }, async ({ request, db }) => {
  const sp = new URL(request.url).searchParams;
  const status = pilihan(sp.get("status"), ["paid", "pending", "failed", "expired"], "");
  const hal = halaman(sp.get("hal"));
  let q = db.from("plan_payments").select("order_id, provider, period_months, amount, status, created_at, paid_at, store_id, stores(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false }).range((hal - 1) * PER_HAL, hal * PER_HAL - 1);
  if (status) q = q.eq("status", status);
  const [lst, ring] = await Promise.all([q, db.rpc("admin_langganan_ringkasan")]);
  if (lst.error) throw new Error(lst.error.message);
  if (ring.error) throw new Error(ring.error.message);
  return balas({ success: true, hal, perHal: PER_HAL, total: lst.count ?? 0, ringkasan: ring.data, pembayaran: lst.data || [] });
});
