"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Link2, Copy, Check, Megaphone } from "lucide-react";

const PRESET = ["igstory", "igbio", "wa", "tiktok", "fb", "shopee"];
const HARI = 30;

// Seller generate link ber-?ref= + lihat breakdown "pesanan dari sumber mana"
// (30 hari terakhir). Data dari kolom orders.ref_source & store_events.ref_source.
export default function UtmBreakdown({ store }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState("igstory");
  const [copied, setCopied] = useState(false);

  const linkToko = `https://tokku-id.vercel.app/${store.slug}`;
  const refBersih = ref.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
  const linkRef = refBersih ? `${linkToko}?ref=${refBersih}` : linkToko;

  useEffect(() => {
    async function fetchData() {
      const sejak = new Date(Date.now() - HARI * 24 * 60 * 60 * 1000).toISOString();
      const [ordersRes, eventsRes] = await Promise.all([
        supabase.from("orders")
          .select("id, midtrans_order_id, total_price, status, ref_source")
          .eq("store_id", store.id).gte("created_at", sejak),
        supabase.from("store_events")
          .select("ref_source")
          .eq("store_id", store.id).eq("type", "view_toko")
          .not("ref_source", "is", null).gte("created_at", sejak)
          .limit(5000),
      ]);

      const peta = {};
      const ambil = (k) => (peta[k] ||= { sumber: k, kunjungan: 0, pesanan: new Set(), dibayar: new Set(), omzet: 0 });

      (eventsRes.data || []).forEach((e) => { ambil(e.ref_source).kunjungan += 1; });

      // 1 transaksi = beberapa baris orders (midtrans_order_id sama) -> hitung per transaksi.
      (ordersRes.data || []).forEach((o) => {
        if (o.status === "gagal") return;
        const k = o.ref_source || "langsung";
        const item = ambil(k);
        const trx = o.midtrans_order_id || o.id;
        item.pesanan.add(trx);
        if (o.status !== "pending") {
          item.dibayar.add(trx);
          item.omzet += Number(o.total_price);
        }
      });

      const hasil = Object.values(peta)
        .map((x) => ({ sumber: x.sumber, kunjungan: x.kunjungan, pesanan: x.pesanan.size, dibayar: x.dibayar.size, omzet: x.omzet }))
        .sort((a, b) => b.pesanan - a.pesanan || b.kunjungan - a.kunjungan);
      setRows(hasil);
      setLoading(false);
    }
    fetchData();
  }, [store.id]);

  async function salin() {
    try {
      await navigator.clipboard.writeText(linkRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      window.prompt("Salin link ini:", linkRef);
    }
  }

  const maxPesanan = Math.max(...rows.map((r) => r.pesanan), 1);

  return (
    <div className="bg-white rounded-xl border border-[#E5E2D9] p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-[#D85A30]" />
          <h2 className="font-bold text-[#1C1C1A]">Pesanan dari sumber mana</h2>
        </div>
        <span className="text-xs text-[#8B8D85]">{HARI} hari terakhir</span>
      </div>

      {/* GENERATOR LINK */}
      <div className="bg-[#FAFAF7] border border-[#E5E2D9] rounded-xl p-3 mb-5">
        <p className="text-xs text-[#5B6472] mb-2 flex items-center gap-1.5">
          <Link2 size={12} /> Bikin link khusus per sumber, terus pasang di tempat promosinya
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET.map((p) => (
            <button key={p} type="button" onClick={() => setRef(p)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                refBersih === p ? "bg-[#D85A30] border-[#D85A30] text-white" : "bg-white border-[#E5E2D9] text-[#5B6472] hover:bg-[#F1EFE8]"
              }`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="nama-sumber"
            className="w-32 px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30] bg-white" />
          <input type="text" readOnly value={linkRef}
            className="flex-1 min-w-0 px-3 py-2 border border-[#E5E2D9] rounded-lg text-xs text-[#5B6472] bg-white" />
          <button type="button" onClick={salin}
            className="px-3 py-2 rounded-lg bg-[#D85A30] text-white text-sm font-medium flex items-center gap-1.5 hover:bg-[#B84A25] transition-colors">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>
      </div>

      {/* BREAKDOWN */}
      {loading ? (
        <p className="text-sm text-[#8B8D85]">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#8B8D85] text-center py-4">
          Belum ada data. Begitu ada pesanan atau kunjungan lewat link ber-<span className="font-mono">?ref=</span>, sumbernya muncul di sini.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.sumber}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-[#1C1C1A]">
                  {r.sumber === "langsung" ? "Langsung / tanpa ref" : r.sumber}
                </span>
                <span className="text-xs text-[#8B8D85]">
                  {r.sumber !== "langsung" && <>{r.kunjungan} kunjungan · </>}
                  {r.pesanan} pesanan · {r.dibayar} dibayar · Rp{r.omzet.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#F1EFE8] overflow-hidden">
                <div className="h-full rounded-full bg-[#D85A30]" style={{ width: `${Math.max((r.pesanan / maxPesanan) * 100, r.pesanan > 0 ? 4 : 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
