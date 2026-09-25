"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Wallet, PackageCheck, Truck, AlertTriangle, PackageX, PackageMinus } from "lucide-react";

export default function YangPerluDilakukan({ store }) {
  const [angka, setAngka] = useState(null); // null = masih loading

  useEffect(() => {
    if (!store?.id) return;

    async function muat() {
      const [{ data: orders }, { data: products }] = await Promise.all([
        supabase.from("orders").select("status").eq("store_id", store.id),
        supabase.from("products").select("stock, variants").eq("store_id", store.id),
      ]);

      const hitungStatus = (status) => (orders || []).filter((o) => o.status === status).length;

      let stokHabis = 0, stokMenipis = 0;
      for (const p of products || []) {
        const totalStok = (p.variants || []).length > 0
          ? p.variants.reduce((s, v) => s + (v.stock || 0), 0)
          : (p.stock || 0);
        if (totalStok === 0) stokHabis++;
        else if (totalStok <= 3) stokMenipis++;
      }

      setAngka({
        menunggu: hitungStatus("pending"),
        perluDiproses: hitungStatus("paid"),
        sedangDikirim: hitungStatus("shipped"),
        perluReview: hitungStatus("perlu_review"),
        stokHabis,
        stokMenipis,
      });
    }

    muat();
  }, [store?.id]);

  const item = (key, label, nilai, Icon, warna, href) => ({ key, label, nilai, Icon, warna, href });

  const daftar = angka ? [
    item("menunggu", "Menunggu bayar", angka.menunggu, Wallet, "#B8860B", "/dashboard/pesanan?tab=menunggu"),
    item("perluDiproses", "Perlu diproses", angka.perluDiproses, PackageCheck, "#3B6D11", "/dashboard/pesanan?tab=perlu_diproses"),
    item("sedangDikirim", "Sedang dikirim", angka.sedangDikirim, Truck, "#2563EB", "/dashboard/pesanan?tab=dikirim"),
    item("perluReview", "Perlu review", angka.perluReview, AlertTriangle, "#B8600B", "/dashboard/pesanan?tab=review"),
    item("stokHabis", "Stok habis", angka.stokHabis, PackageX, "#A32D2D", "/dashboard/produk"),
    item("stokMenipis", "Stok menipis", angka.stokMenipis, PackageMinus, "#B8860B", "/dashboard/produk"),
  ] : [];

  return (
    <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 mb-6">
      <h3 className="font-semibold text-[#1C1C1A] mb-4">Yang perlu dilakukan</h3>
      {!angka ? (
        <p className="text-sm text-[#8B8D85]">Memuat...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {daftar.map(({ key, label, nilai, Icon, warna, href }) => (
            <a key={key} href={href}
              className="flex items-center gap-3 border border-[#F1EFE8] rounded-lg p-3 hover:border-[#D85A30] transition-colors">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${warna}1A`, color: warna }}>
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-[#1C1C1A] leading-tight">{nilai}</p>
                <p className="text-xs text-[#8B8D85] truncate">{label}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
