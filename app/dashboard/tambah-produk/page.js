"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TambahProduk() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [adaVarian, setAdaVarian] = useState(false);
  const [variants, setVariants] = useState([{ name: "", price: "", stock: "" }]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/masuk";
        return;
      }
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!storeData) {
        window.location.href = "/dashboard";
        return;
      }
      setStore(storeData);
      setLoading(false);
    }
    init();
  }, []);

  function updateVariant(index, field, value) {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  }

  function addVariantRow() {
    setVariants([...variants, { name: "", price: "", stock: "" }]);
  }

  function removeVariantRow(index) {
    setVariants(variants.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      store_id: store.id,
      name,
      description,
      category,
      price: adaVarian ? (variants[0]?.price || 0) : parseInt(price || 0),
      stock: adaVarian ? variants.reduce((sum, v) => sum + parseInt(v.stock || 0), 0) : parseInt(stock || 0),
      images: imageUrl ? [imageUrl] : [],
      video_url: videoUrl || null,
      variants: adaVarian
        ? variants.map((v) => ({ name: v.name, price: parseInt(v.price || 0), stock: parseInt(v.stock || 0) }))
        : [],
    };

    const { error } = await supabase.from("products").insert(payload);

    setSaving(false);

    if (error) {
      alert("Gagal simpan produk: " + error.message);
    } else {
      window.location.href = "/dashboard";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <p className="text-[#8B8D85]">Memuat...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] font-[family-name:var(--font-baloo)]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2D9] bg-white">
        <a href="/dashboard" className="font-bold text-xl tracking-tight text-[#1C1C1A]">
          tok<span className="text-[#D85A30]">k</span>u<span className="text-[#8B8D85] font-normal">.id</span>
        </a>
        <a href="/dashboard" className="text-sm text-[#5B6472] hover:text-[#1C1C1A]">
          Batal
        </a>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-[#1C1C1A] mb-6">Tambah produk</h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-[#E5E2D9] p-6">
          <div>
            <label className="text-sm text-[#5B6472] block mb-1">Nama produk</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
              placeholder="Kaos Oversize Polos"
            />
          </div>

          <div>
            <label className="text-sm text-[#5B6472] block mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
              placeholder="Bahan katun combed 24s, adem dan gak gampang melar."
            />
          </div>

          <div>
            <label className="text-sm text-[#5B6472] block mb-1">Kategori</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
              placeholder="Pakaian Pria"
            />
          </div>

          <div>
            <label className="text-sm text-[#5B6472] block mb-1">Link foto produk</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
              placeholder="https://..."
            />
            <p className="text-xs text-[#8B8D85] mt-1">Upload file langsung bakal kita tambahin nanti.</p>
          </div>

          <div>
            <label className="text-sm text-[#5B6472] block mb-1">Link video (opsional)</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="adaVarian"
              checked={adaVarian}
              onChange={(e) => setAdaVarian(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="adaVarian" className="text-sm text-[#5B6472]">
              Produk ini punya varian (ukuran, warna, dll)
            </label>
          </div>

          {!adaVarian ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#5B6472] block mb-1">Harga</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
                  placeholder="150000"
                />
              </div>
              <div>
                <label className="text-sm text-[#5B6472] block mb-1">Stok</label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
                  placeholder="20"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm text-[#5B6472] block">Varian</label>
              {variants.map((v, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Merah - M"
                    value={v.name}
                    onChange={(e) => updateVariant(i, "name", e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
                  />
                  <input
                    type="number"
                    placeholder="Harga"
                    value={v.price}
                    onChange={(e) => updateVariant(i, "price", e.target.value)}
                    className="w-24 px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
                  />
                  <input
                    type="number"
                    placeholder="Stok"
                    value={v.stock}
                    onChange={(e) => updateVariant(i, "stock", e.target.value)}
                    className="w-20 px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
                  />
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariantRow(i)}
                      className="text-[#A32D2D] text-sm px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addVariantRow}
                className="text-sm text-[#D85A30] font-medium"
              >
                + Tambah varian
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#D85A30] text-white rounded-lg font-medium hover:bg-[#B84A25] transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan produk"}
          </button>
        </form>
      </div>
    </main>
  );
}