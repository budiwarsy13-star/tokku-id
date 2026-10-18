"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { bisa, rupiah } from "@/lib/plans";
import { MessageCircle } from "lucide-react";

// Teaser untuk paket Gratis: tunjukkan uang yang "bocor" dari checkout yang tidak dibayar,
// supaya nilai Cart Recovery (Pro) kelihatan nyata. Hilang otomatis kalau sudah Pro.
export default function TeaserRecovery({ store }) {
  const [data, setData] = useState(null);
  const pro = bisa(store, "cart_recovery");

  useEffect(() => {
    if (pro) return;
    (async () => {
      const sejak = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: rows } = await supabase.from("orders")
        .select("id, midtrans_order_id, total_price")
        .eq("store_id", store.id).in("status", ["pending", "gagal"]).gte("created_at", sejak).limit(1000);
      const peta = new Map();
      (rows || []).forEach((o) => {
        const k = o.midtrans_order_id || o.id;
        peta.set(k, (peta.get(k) || 0) + Number(o.total_price));
      });
      setData({ jumlah: peta.size, total: Array.from(peta.values()).reduce((a, b) => a + b, 0) });
    })();
  }, [store.id, pro]);

  if (pro || !data || data.jumlah === 0) return null;
  return (
    <div className="rounded-xl border border-[#D85A30]/30 bg-[#FAECE7] p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0"><MessageCircle size={18} className="text-[#D85A30]" /></div>
        <div>
          <p className="font-bold text-[#1C1C1A]">{data.jumlah} checkout belum dibayar dalam 7 hari ({rupiah(data.total)})</p>
          <p className="text-sm text-[#5B6472]">Paket Pro otomatis mengirim WhatsApp ke pembeli yang belum menyelesaikan pembayaran, lengkap dengan link bayar.</p>
        </div>
      </div>
      <Link href="/dashboard/langganan" className="px-4 py-2.5 rounded-lg bg-[#D85A30] text-white text-sm font-medium text-center hover:bg-[#B84A25] whitespace-nowrap">Aktifkan Cart Recovery</Link>
    </div>
  );
}
