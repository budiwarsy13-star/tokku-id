"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Check, Search, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";

function totalStokProduk(p) {
  return (p.variants || []).length > 0 ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : (p.stock || 0);
}
function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

const TAB_LIST = [
  { key: "semua", label: "Semua Produk" },
  { key: "habis", label: "Stok Habis" },
  { key: "menipis", label: "Stok Menipis" },
];

const TIPE_LABEL = {
  terjual: { label: "Terjual", warna: "text-[#A32D2D]" },
  dikembalikan: { label: "Dikembalikan", warna: "text-[#3B6D11]" },
  penyesuaian_manual: { label: "Penyesuaian manual", warna: "text-[#2563EB]" },
};

export default function KelolaHargaPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [ubahan, setUbahan] = useState({}); // { [id]: { price?, hpp?, stock?, stok_minimum? } }
  const [dipilih, setDipilih] = useState(new Set());
  const [nilaiBulk, setNilaiBulk] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [search, setSearch] = useState("");
  const [tabAktif, setTabAktif] = useState("semua");
  const [expanded, setExpanded] = useState(null);
  const [logs, setLogs] = useState({});

  async function muatProduk(storeId) {
    const { data } = await supabase.from("products").select("*").eq("store_id", storeId).order("name", { ascending: true });
    setProducts(data || []);
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

  const produkNonVarian = useMemo(() => products.filter((p) => !(p.variants || []).length), [products]);

  function nilaiField(p, field) {
    return ubahan[p.id]?.[field] ?? p[field];
  }
  function ubahField(id, field, value) {
    setUbahan((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value === "" ? "" : Number(value) } }));
  }

  function toggleSemua(cek) {
    setDipilih(cek ? new Set(produkTampil.filter((p) => !(p.variants || []).length).map((p) => p.id)) : new Set());
  }
  function toggleSatu(id) {
    setDipilih((prev) => {
      const baru = new Set(prev);
      baru.has(id) ? baru.delete(id) : baru.add(id);
      return baru;
    });
  }

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

  function stokCepat(p, arah) {
    const stokSekarang = nilaiField(p, "stock");
    const baru = arah === "tambah" ? stokSekarang + 1 : Math.max(0, stokSekarang - 1);
    ubahField(p.id, "stock", String(baru));
  }

  async function simpanSemua() {
    const idBerubah = Object.keys(ubahan).filter((id) => {
      const u = ubahan[id];
      return ["price", "hpp", "stock", "stok_minimum"].some((f) => u[f] !== undefined && u[f] !== "");
    });
    if (idBerubah.length === 0) return;

    setMenyimpan(true);
    setSukses(false);

    await Promise.all(idBerubah.map((id) => {
      const produkLama = products.find((p) => p.id === id);
      const u = ubahan[id];
      const payload = {};
      if (u.price !== undefined && u.price !== "") payload.price = u.price;
      if (u.hpp !== undefined && u.hpp !== "") payload.hpp = u.hpp;
      if (u.stock !== undefined && u.stock !== "") payload.stock = u.stock;
      if (u.stok_minimum !== undefined && u.stok_minimum !== "") payload.stok_minimum = u.stok_minimum;

      return supabase.from("products").update(payload).eq("id", id).then(async () => {
        if (payload.stock !== undefined && produkLama && payload.stock !== produkLama.stock) {
          await supabase.from("stock_logs").insert({
            store_id: store.id, product_id: id, product_name: produkLama.name, variant_name: null,
            tipe: "penyesuaian_manual", perubahan: payload.stock - produkLama.stock,
            stok_sebelum: produkLama.stock, stok_sesudah: payload.stock, catatan: "Diubah lewat Kelola Harga & Stok",
          });
        }
      });
    }));

    await muatProduk(store.id);
    setUbahan({});
    setDipilih(new Set());
    setLogs({});
    setMenyimpan(false);
    setSukses(true);
    setTimeout(() => setSukses(false), 3000);
  }

  async function bukaRiwayat(productId) {
    if (expanded === productId) { setExpanded(null); return; }
    setExpanded(productId);
    if (!logs[productId]) {
      const { data } = await supabase.from("stock_logs").select("*").eq("product_id", productId)
        .order("created_at", { ascending: false }).limit(15);
      setLogs((prev) => ({ ...prev, [productId]: data || [] }));
    }
  }

  const produkTampil = useMemo(() => {
    let hasil = products;
    const q = search.trim().toLowerCase();
    if (q) hasil = hasil.filter((p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    if (tabAktif === "habis") hasil = hasil.filter((p) => totalStokProduk(p) === 0);
    if (tabAktif === "menipis") hasil = hasil.filter((p) => { const t = totalStokProduk(p); return t > 0 && t <= (p.stok_minimum ?? 3); });
    return hasil;
  }, [products, search, tabAktif]);

  const hitungTab = (key) => {
    if (key === "semua") return products.length;
    if (key === "habis") return products.filter((p) => totalStokProduk(p) === 0).length;
    return products.filter((p) => { const t = totalStokProduk(p); return t > 0 && t <= (p.stok_minimum ?? 3); }).length;
  };

  const jumlahBerubah = Object.keys(ubahan).filter((id) => {
    const u = ubahan[id];
    return ["price", "hpp", "stock", "stok_minimum"].some((f) => u[f] !== undefined && u[f] !== "");
  }).length;

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/produk" headerTitle="Kelola Harga & Stok"
      headerRight={
        <button onClick={simpanSemua} disabled={jumlahBerubah === 0 || menyimpan}
          className="text-sm bg-[#D85A30] text-white px-4 py-2 rounded-lg hover:bg-[#B84A25] disabled:opacity-40 transition-colors flex items-center gap-2">
          {menyimpan && <Loader2 size={15} className="animate-spin" />}
          {sukses && <Check size={15} />}
          {menyimpan ? "Menyimpan..." : sukses ? "Tersimpan" : `Simpan ${jumlahBerubah > 0 ? `(${jumlahBerubah})` : ""}`}
        </button>
      }>
      <div className="max-w-5xl space-y-4">
        {/* Search + tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8D85]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk atau SKU..."
              className="w-full pl-9 pr-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>
        </div>
        <div className="flex gap-1 border-b border-[#E5E2D9]">
          {TAB_LIST.map((t) => (
            <button key={t.key} onClick={() => setTabAktif(t.key)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${tabAktif === t.key ? "border-[#D85A30] text-[#D85A30] font-medium" : "border-transparent text-[#8B8D85] hover:text-[#1C1C1A]"}`}>
              {t.label} <span className="text-xs">({hitungTab(t.key)})</span>
            </button>
          ))}
        </div>

        {/* Bulk toolbar */}
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

        {/* Tabel */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8B8D85]">
                <th className="p-3 w-8">
                  <input type="checkbox" onChange={(e) => toggleSemua(e.target.checked)}
                    checked={dipilih.size > 0 && dipilih.size === produkTampil.filter((p) => !(p.variants || []).length).length} />
                </th>
                <th className="p-3">Produk</th>
                <th className="p-3 w-28">Harga Jual</th>
                <th className="p-3 w-24">HPP</th>
                <th className="p-3 w-20">Margin</th>
                <th className="p-3 w-32">Stok</th>
                <th className="p-3 w-24">Batas Min.</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {produkTampil.map((p) => {
                const punyaVarian = (p.variants || []).length > 0;
                const berubah = ubahan[p.id];
                const harga = nilaiField(p, "price");
                const hpp = nilaiField(p, "hpp");
                const margin = hpp ? Math.round(((harga - hpp) / harga) * 100) : null;
                const stokVal = nilaiField(p, "stock");
                const stok = punyaVarian ? totalStokProduk(p) : stokVal;
                const warnaStok = stok === 0 ? "text-[#A32D2D]" : stok <= (p.stok_minimum ?? 3) ? "text-[#B8860B]" : "text-[#1C1C1A]";

                return (
                  <Fragment key={p.id}>
                    <tr className={`border-b border-[#F1EFE8] last:border-0 ${berubah ? "bg-[#FDF8F5]" : ""}`}>
                      <td className="p-3 align-top pt-4">
                        {!punyaVarian && <input type="checkbox" checked={dipilih.has(p.id)} onChange={() => toggleSatu(p.id)} />}
                      </td>
                      <td className="p-3 align-top">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#F1EFE8] shrink-0 overflow-hidden">
                            {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#1C1C1A] truncate">{p.name}</p>
                            {p.sku && <p className="text-xs text-[#8B8D85]">{p.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 align-top">
                        {punyaVarian ? (
                          <a href={`/dashboard/produk/edit/${p.id}`} className="text-xs text-[#D85A30] hover:underline">
                            {(p.variants || []).length} varian
                          </a>
                        ) : (
                          <input type="number" value={harga} onChange={(e) => ubahField(p.id, "price", e.target.value)}
                            className="w-24 px-2 py-1.5 border border-[#E5E2D9] rounded-lg" />
                        )}
                      </td>
                      <td className="p-3 align-top">
                        {!punyaVarian && (
                          <input type="number" value={hpp || ""} onChange={(e) => ubahField(p.id, "hpp", e.target.value)}
                            placeholder="-" className="w-20 px-2 py-1.5 border border-[#E5E2D9] rounded-lg" />
                        )}
                      </td>
                      <td className="p-3 align-top">
                        {margin !== null ? (
                          <span className={margin < 15 ? "text-[#A32D2D]" : margin < 30 ? "text-[#B8860B]" : "text-[#3B6D11]"}>{margin}%</span>
                        ) : <span className="text-[#8B8D85]">-</span>}
                      </td>
                      <td className="p-3 align-top">
                        {punyaVarian ? (
                          <span className={`text-xs ${warnaStok}`}>{stok} (total varian)</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => stokCepat(p, "kurang")} className="w-6 h-6 rounded border border-[#E5E2D9] flex items-center justify-center hover:border-[#D85A30]"><Minus size={11} /></button>
                            <input type="number" value={stokVal} onChange={(e) => ubahField(p.id, "stock", e.target.value)}
                              className={`w-14 px-1 py-1.5 border border-[#E5E2D9] rounded-lg text-center ${warnaStok}`} />
                            <button onClick={() => stokCepat(p, "tambah")} className="w-6 h-6 rounded border border-[#E5E2D9] flex items-center justify-center hover:border-[#D85A30]"><Plus size={11} /></button>
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-top">
                        <input type="number" value={nilaiField(p, "stok_minimum") ?? 3} onChange={(e) => ubahField(p.id, "stok_minimum", e.target.value)}
                          className="w-16 px-2 py-1.5 border border-[#E5E2D9] rounded-lg" />
                      </td>
                      <td className="p-3 align-top">
                        <button onClick={() => bukaRiwayat(p.id)} className="text-[#8B8D85]">
                          {expanded === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                    {expanded === p.id && (
                      <tr>
                        <td colSpan={8} className="bg-[#FAFAF7] px-3 pb-3">
                          {!logs[p.id] ? (
                            <p className="text-xs text-[#8B8D85] py-2">Memuat riwayat...</p>
                          ) : logs[p.id].length === 0 ? (
                            <p className="text-xs text-[#8B8D85] py-2">Belum ada riwayat perubahan stok.</p>
                          ) : (
                            <div className="space-y-1.5 py-2">
                              {logs[p.id].map((l) => (
                                <div key={l.id} className="text-xs flex items-center justify-between">
                                  <span className={TIPE_LABEL[l.tipe]?.warna || "text-[#5B6472]"}>
                                    {TIPE_LABEL[l.tipe]?.label || l.tipe}{l.variant_name ? ` · ${l.variant_name}` : ""}{l.catatan ? ` — ${l.catatan}` : ""}
                                  </span>
                                  <span className="text-[#8B8D85] shrink-0 ml-2">
                                    {l.perubahan > 0 ? "+" : ""}{l.perubahan} · {new Date(l.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {produkTampil.length === 0 && (
            <p className="text-sm text-[#8B8D85] text-center py-8">
              {products.length === 0 ? "Belum ada produk." : "Gak ketemu produk yang cocok."}
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
