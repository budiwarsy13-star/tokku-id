import { dengan, balas } from "@/lib/admin-http";

export const GET = dengan({ izin: "audit.baca" }, async ({ db }) => {
  const { data, error } = await db.rpc("admin_audit_verify");
  if (error) throw new Error(error.message);
  const r = data?.[0] || { ok: true, total: 0, rusak_di_seq: null };
  return balas({ success: true, utuh: !!r.ok, total: Number(r.total), rusakDiSeq: r.rusak_di_seq });
});
