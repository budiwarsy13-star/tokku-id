"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { ChevronDown, ChevronUp, Plus, Minus, PackageX, PackageMinus, Package } from "lucide-react";

function totalStokProduk(p) {
  return (p.variants || []).length > 0 ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : (p.stock || 0);
}

const TIPE_LABEL = {
  terjual: { label: "Terjual", warna: "text-[#A32D2D]" },
  dikembalikan: { label: "Dikembalikan", warna: "text-[#3B6D11]" },
  penyesuaian_manual: { label: "Penyesuaian manual", warna: "text-[#2563EB]" },
};

export default function InventoriPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [logs, setLogs] = useState({}); // { [productId]: [...] }
  const [formAktif, setFormAktif] = useState(null); // productId yang lagi diisi form penyesuaian
  const [jumlahForm, setJumlahForm] = useState("");
  const [catatanForm, setCatatanForm] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  async function muatProduk(storeId) {
    const { data } = await supabase.from("products").select("*").eq("store_id", storeId);
    const diurutkan = (data || []).sort((a, b) => totalStokProduk(a) - totalStokProduk(b));
    setProducts(diurutkan);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      await muatProduk(storeData.id);
      setLoading(false);
    }
    init();
  }, []);

  const ringkasan = useMemo(() => {
    let habis = 0, menipis = 0;
    for (const p of products) {
      const t = totalStokProduk(p);
      if (t === 0) habis++;
      else if (t <= 3) menipis++;
    }
    return { totalSku: products.length, habis, menipis };
  }, [products]);

  async function bukaRiwayat(productId) {
    if (expanded === productId) { setExpanded(null); return; }
    setExpanded(productId);
    if (!logs[productId]) {
      const { data } = await supabase
        .from("stock_logs").select("*").eq("product_id", productId)
        .order("created_at", { ascending: false }).limit(20);
      setLogs((prev) => ({ ...prev, [productId]: data || [] }));
    }
  }

  function bukaForm(productId) {
    setFormAktif(formAktif === productId ? null : productId);
    setJumlahForm("");
    setCatatanForm("");
  }

  async function simpanPenyesuaian(product, arah) {
    const qty = Number(jumlahForm);
    if (!qty || qty <= 0) return;
    const perubahan = arah === "tambah" ? qty : -qty;
    const stokSesudah = Math.max(0, product.stock + perubahan);

    setMenyimpan(true);
    await supabase.from("products").update({ stock: stokSesudah }).eq("id", product.id);
    await supabase.from("stock_logs").insert({
      store_id: store.id, product_id: product.id, product_name: product.name, variant_name: null,
      tipe: "penyesuaian_manual", perubahan: stokSesudah - product.stock,
      stok_sebelum: product.stock, stok_sesudah: stokSesudah,
      catatan: catatanForm.trim() || null,
    });

    await muatProduk(store.id);
    setLogs((prev) => ({ ...prev, [product.id]: undefined })); // biar di-refetch pas dibuka lagi
    setFormAktif(null);
    setMenyimpan(false);
  }

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/inventori" headerTitle="Inventori">
      <div className="max-w-3xl space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 text-center">
            <Package size={18} className="mx-auto text-[#5B6472] mb-1" />
            <p className="text-lg font-semibold text-[#1C1C1A]">{ringkasan.totalSku}</p>
            <p className="text-xs text-[#8B8D85]">Total SKU</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 text-center">
            <PackageX size={18} className="mx-auto text-[#A32D2D] mb-1" />
            <p className="text-lg font-semibold text-[#1C1C1A]">{ringkasan.habis}</p>
            <p className="text-xs text-[#8B8D85]">Stok habis</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 text-center">
            <PackageMinus size={18} className="mx-auto text-[#B8860B] mb-1" />
            <p className="text-lg font-semibold text-[#1C1C1A]">{ringkasan.menipis}</p>
            <p className="text-xs text-[#8B8D85]">Stok menipis</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E2D9] divide-y divide-[#F1EFE8]">
          {products.map((p) => {
            const punyaVarian = (p.variants || []).length > 0;
            const stok = totalStokProduk(p);
            const warnaStok = stok === 0 ? "text-[#A32D2D]" : stok <= 3 ? "text-[#B8860B]" : "text-[#1C1C1A]";

            return (
              <div key={p.id}>
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#F1EFE8] shrink-0 overflow-hidden">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#1C1C1A] truncate">{p.name}</p>
                      <p className={`text-xs font-medium ${warnaStok}`}>
                        {stok} stok{punyaVarian ? " (total varian)" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!punyaVarian && (
                      <button onClick={() => bukaForm(p.id)}
                        className="text-xs border border-[#E5E2D9] px-3 py-1.5 rounded-lg hover:border-[#D85A30]">
                        Sesuaikan
                      </button>
                    )}
                    <button onClick={() => bukaRiwayat(p.id)} className="text-[#8B8D85]">
                      {expanded === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {formAktif === p.id && (
                  <div className="px-3 pb-3 flex flex-wrap items-center gap-2 bg-[#FDF8F5]">
                    <input type="number" value={jumlahForm} onChange={(e) => setJumlahForm(e.target.value)}
                      placeholder="Jumlah" className="w-24 px-2 py-1.5 border border-[#E5E2D9] rounded-lg text-sm" />
                    <input type="text" value={catatanForm} onChange={(e) => setCatatanForm(e.target.value)}
                      placeholder="Alasan (opsional, misal: restock dari supplier)"
                      className="flex-1 min-w-[160px] px-2 py-1.5 border border-[#E5E2D9] rounded-lg text-sm" />
                    <button onClick={() => simpanPenyesuaian(p, "tambah")} disabled={menyimpan}
                      className="text-xs bg-[#3B6D11] text-white px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
                      <Plus size={12} /> Tambah
                    </button>
                    <button onClick={() => simpanPenyesuaian(p, "kurang")} disabled={menyimpan}
                      className="text-xs bg-[#A32D2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
                      <Minus size={12} /> Kurangi
                    </button>
                  </div>
                )}

                {expanded === p.id && (
                  <div className="px-3 pb-3 bg-[#FAFAF7]">
                    {!logs[p.id] ? (
                      <p className="text-xs text-[#8B8D85] py-2">Memuat riwayat...</p>
                    ) : logs[p.id].length === 0 ? (
                      <p className="text-xs text-[#8B8D85] py-2">Belum ada riwayat perubahan stok.</p>
                    ) : (
                      <div className="space-y-1.5 py-2">
                        {logs[p.id].map((l) => (
                          <div key={l.id} className="text-xs flex items-center justify-between">
                            <span className={TIPE_LABEL[l.tipe]?.warna || "text-[#5B6472]"}>
                              {TIPE_LABEL[l.tipe]?.label || l.tipe}
                              {l.variant_name ? ` · ${l.variant_name}` : ""}
                              {l.catatan ? ` — ${l.catatan}` : ""}
                            </span>
                            <span className="text-[#8B8D85] shrink-0 ml-2">
                              {l.perubahan > 0 ? "+" : ""}{l.perubahan} · {new Date(l.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {products.length === 0 && (
            <p className="text-sm text-[#8B8D85] text-center py-8">Belum ada produk.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
