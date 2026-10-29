import { dengan, balas } from "@/lib/admin-http";

export const GET = dengan({ izin: "keuangan.baca" }, async ({ db }) => {
  const { data, error } = await db.rpc("admin_keuangan");
  if (error) throw new Error(error.message);
  const baris = (data || []).map((r) => ({ ...r }));
  const jumlah = (k) => baris.reduce((s, r) => s + Number(r[k] || 0), 0);
  return balas({
    success: true, seller: baris,
    total: { ditahan: jumlah("ditahan"), dapat_dicairkan: jumlah("dapat_dicairkan"), sengketa: jumlah("sengketa"), sudah_dicairkan: jumlah("sudah_dicairkan"), saldo: jumlah("saldo") },
  });
});
