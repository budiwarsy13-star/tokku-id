import { dengan, balas } from "@/lib/admin-http";
import { halaman } from "@/lib/admin-data";

const PER_HAL = 50;
export const GET = dengan({ izin: "audit.baca" }, async ({ request, db }) => {
  const hal = halaman(new URL(request.url).searchParams.get("hal"));
  const { data, error, count } = await db.from("admin_audit_log")
    .select("seq, created_at, admin_email, role, action, target_type, target_id, reason, detail, ip", { count: "exact" })
    .order("seq", { ascending: false }).range((hal - 1) * PER_HAL, hal * PER_HAL - 1);
  if (error) throw new Error(error.message);
  return balas({ success: true, hal, perHal: PER_HAL, total: count ?? 0, log: data || [] });
});
