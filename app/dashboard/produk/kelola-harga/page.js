"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Check } from "lucide-react";

function totalStokProduk(p) {
  return (p.variants || []).length > 0 ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : (p.stock || 0);
}

export default function KelolaHargaPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [ubahan, setUbahan] = useState({}); // { [id]: { price?, stock? } }
  const [dipilih, setDipilih] = useState(new Set());
  const [nilaiBulk, setNilaiBulk] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [sukses, setSukses] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      const { data: productsData } = await supabase
        .from("products").select("*").eq("store_id", storeData.id).order("name", { ascending: true });
      setProducts(productsData || []);
      setLoading(false);
    }
    init();
  }, []);

  const produkNonVarian = useMemo(() => products.filter((p) => !(p.variants || []).length), [products]);

  function nilaiHarga(p) {
    return ubahan[p.id]?.price ?? p.price;
  }
  function nilaiStok(p) {
    return ubahan[p.id]?.stock ?? p.stock;
  }

  function ubahField(id, field, value) {
    setUbahan((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value === "" ? "" : Number(value) } }));
  }

  function toggleSemua(cek) {
    setDipilih(cek ? new Set(produkNonVarian.map((p) => p.id)) : new Set());
  }
  function toggleSatu(id) {
    setDipilih((prev) => {
      const baru = new Set(prev);
      baru.has(id) ? baru.delete(id) : baru.add(id);
      return baru;
    });
  }

  // Terapkan penyesuaian massal CUMA ke produk yang dipilih & gak punya
  // varian (produk dengan varian harganya di-set per varian, bukan di
  // level produk — gak masuk akal dipukul rata di sini).
  function terapkanBulk(mode) {
    if (nilaiBulk === "") return;
    const angka = Number(nilaiBulk);
    if (Number.isNaN(angka)) return;
    setUbahan((prev) => {
      const baru = { ...prev };
      for (const p of produkNonVarian) {
        if (!dipilih.has(p.id)) continue;
        const hargaSekarang = baru[p.id]?.price ?? p.price;
        let hargaBaru = hargaSekarang;
        if (mode === "naik_persen") hargaBaru = Math.round(hargaSekarang * (1 + angka / 100));
        if (mode === "turun_persen") hargaBaru = Math.round(hargaSekarang * (1 - angka / 100));
        if (mode === "set") hargaBaru = angka;
        baru[p.id] = { ...baru[p.id], price: Math.max(0, hargaBaru) };
      }
      return baru;
    });
  }

  async function simpanSemua() {
    const idBerubah = Object.keys(ubahan).filter((id) => {
      const u = ubahan[id];
      return (u.price !== undefined && u.price !== "") || (u.stock !== undefined && u.stock !== "");
    });
    if (idBerubah.length === 0) return;

    setMenyimpan(true);
    setSukses(false);

    await Promise.all(idBerubah.map((id) => {
      const payload = {};
      if (ubahan[id].price !== undefined && ubahan[id].price !== "") payload.price = ubahan[id].price;
      if (ubahan[id].stock !== undefined && ubahan[id].stock !== "") payload.stock = ubahan[id].stock;
      return supabase.from("products").update(payload).eq("id", id);
    }));

    // Refresh data dari server biar state-nya konsisten sama DB
    const { data: productsData } = await supabase
      .from("products").select("*").eq("store_id", store.id).order("name", { ascending: true });
    setProducts(productsData || []);
    setUbahan({});
    setDipilih(new Set());
    setMenyimpan(false);
    setSukses(true);
    setTimeout(() => setSukses(false), 3000);
  }

  const jumlahBerubah = Object.keys(ubahan).filter((id) => {
    const u = ubahan[id];
    return (u.price !== undefined && u.price !== "") || (u.stock !== undefined && u.stock !== "");
  }).length;

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/produk" headerTitle="Kelola Harga"
      headerRight={
        <button onClick={simpanSemua} disabled={jumlahBerubah === 0 || menyimpan}
          className="text-sm bg-[#D85A30] text-white px-4 py-2 rounded-lg hover:bg-[#B84A25] disabled:opacity-40 transition-colors flex items-center gap-2">
          {menyimpan && <Loader2 size={15} className="animate-spin" />}
          {sukses && <Check size={15} />}
          {menyimpan ? "Menyimpan..." : sukses ? "Tersimpan" : `Simpan ${jumlahBerubah > 0 ? `(${jumlahBerubah})` : ""}`}
        </button>
      }>
      <div className="max-w-4xl space-y-4">
        {dipilih.size > 0 && (
          <div className="bg-[#FDF8F5] border border-[#F0D9CC] rounded-xl p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#1C1C1A] font-medium">{dipilih.size} dipilih:</span>
            <input type="number" value={nilaiBulk} onChange={(e) => setNilaiBulk(e.target.value)} placeholder="Angka"
              className="w-24 px-2 py-1.5 border border-[#E5E2D9] rounded-lg text-sm" />
            <button onClick={() => terapkanBulk("naik_persen")} className="text-xs border border-[#E5E2D9] px-3 py-1.5 rounded-lg hover:border-[#D85A30]">Naikkan harga %</button>
            <button onClick={() => terapkanBulk("turun_persen")} className="text-xs border border-[#E5E2D9] px-3 py-1.5 rounded-lg hover:border-[#D85A30]">Turunkan harga %</button>
            <button onClick={() => terapkanBulk("set")} className="text-xs border border-[#E5E2D9] px-3 py-1.5 rounded-lg hover:border-[#D85A30]">Set harga = Rp</button>
            <p className="text-xs text-[#8B8D85] w-full">Perubahan belum tersimpan sampai kamu klik "Simpan" di pojok kanan atas.</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8B8D85]">
                <th className="p-3 w-8">
                  <input type="checkbox" onChange={(e) => toggleSemua(e.target.checked)}
                    checked={dipilih.size > 0 && dipilih.size === produkNonVarian.length} />
                </th>
                <th className="p-3">Produk</th>
                <th className="p-3">Harga</th>
                <th className="p-3">Stok</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const punyaVarian = (p.variants || []).length > 0;
                const berubah = ubahan[p.id];
                return (
                  <tr key={p.id} className={`border-b border-[#F1EFE8] last:border-0 ${berubah ? "bg-[#FDF8F5]" : ""}`}>
                    <td className="p-3">
                      {!punyaVarian && (
                        <input type="checkbox" checked={dipilih.has(p.id)} onChange={() => toggleSatu(p.id)} />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#F1EFE8] shrink-0 overflow-hidden">
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="text-[#1C1C1A] truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {punyaVarian ? (
                        <a href={`/dashboard/produk/edit/${p.id}`} className="text-xs text-[#D85A30] hover:underline">
                          {(p.variants || []).length} varian — edit manual
                        </a>
                      ) : (
                        <input type="number" value={nilaiHarga(p)} onChange={(e) => ubahField(p.id, "price", e.target.value)}
                          className="w-28 px-2 py-1.5 border border-[#E5E2D9] rounded-lg" />
                      )}
                    </td>
                    <td className="p-3">
                      {punyaVarian ? (
                        <span className="text-xs text-[#8B8D85]">{totalStokProduk(p)} (total varian)</span>
                      ) : (
                        <input type="number" value={nilaiStok(p)} onChange={(e) => ubahField(p.id, "stock", e.target.value)}
                          className="w-20 px-2 py-1.5 border border-[#E5E2D9] rounded-lg" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && (
            <p className="text-sm text-[#8B8D85] text-center py-8">Belum ada produk.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
