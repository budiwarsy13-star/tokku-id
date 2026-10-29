// Helper data admin (server). Pembacaan saja, tanpa efek samping.

export function halaman(x) {
  const n = Number(x);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}

// Kasus komplain/retur yang belum diputus admin. Dibatasi 1000 terbaru per jenis (ada flag terpotong).
export async function ambilKasusTerbuka(db) {
  const BATAS = 1000;
  const [kom, ret, sel] = await Promise.all([
    db.from("complaints").select("*").order("created_at", { ascending: false }).limit(BATAS),
    db.from("order_returns").select("*").order("created_at", { ascending: false }).limit(BATAS),
    db.from("admin_cases").select("kind, case_id").in("status", ["selesai", "ditolak"]).limit(10000),
  ]);
  for (const x of [kom, ret, sel]) if (x.error) throw new Error(x.error.message);
  const selesai = new Set((sel.data || []).map((c) => `${c.kind}:${c.case_id}`));
  const komTerbuka = (kom.data || []).filter((c) => !selesai.has(`komplain:${c.id}`));
  const retTerbuka = (ret.data || []).filter((c) => !selesai.has(`retur:${c.id}`));
  return {
    komplain: komTerbuka.length,
    retur: retTerbuka.length,
    mintaCs: komTerbuka.filter((c) => c.involves_cs).length,
    terpotong: (kom.data || []).length >= BATAS || (ret.data || []).length >= BATAS,
  };
}

// Tanya status transaksi ke Midtrans (server-ke-server). Sumber kebenaran, bukan keputusan manual admin.
export async function statusMidtrans(orderId) {
  const prod = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = prod ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
  const res = await fetch(`${base}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: "application/json", Authorization: "Basic " + Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64") },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { httpOk: res.ok, data };
}

export function klasifikasiStatusMidtrans(data) {
  const s = data?.transaction_status;
  if (s === "settlement" || (s === "capture" && data?.fraud_status === "accept")) return "paid";
  if (["expire", "cancel", "deny"].includes(s)) return s === "expire" ? "expired" : "failed";
  return "pending";
}
