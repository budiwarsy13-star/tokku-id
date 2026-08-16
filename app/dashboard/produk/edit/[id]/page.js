"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { X, Upload, Video } from "lucide-react";

export default function EditProduk() {
  const params = useParams();
  const productId = params.id;

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("500");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const [images, setImages] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [adaVarian, setAdaVarian] = useState(false);
  const [variants, setVariants] = useState([{ name: "", sku: "", price: "", stock: "" }]);

  const photoInputRef = useRef();
  const videoInputRef = useRef();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);

      const { data: product } = await supabase.from("products").select("*").eq("id", productId).eq("store_id", storeData.id).maybeSingle();
      if (!product) { setNotFound(true); setLoading(false); return; }

      setName(product.name || "");
      setDescription(product.description || "");
      setCategory(product.category || "");
      setSku(product.sku || "");
      setWeight(String(product.weight || 500));
      setImages(product.images || []);
      setVideoUrl(product.video_url || "");

      if (product.variants && product.variants.length > 0) {
        setAdaVarian(true);
        setVariants(product.variants.map((v) => ({ name: v.name || "", sku: v.sku || "", price: String(v.price || ""), stock: String(v.stock || "") })));
      } else {
        setPrice(String(product.price || ""));
        setStock(String(product.stock || ""));
      }

      setLoading(false);
    }
    init();
  }, [productId]);

  async function uploadFile(file, storeId) {
    const ext = file.name.split(".").pop();
    const path = `${storeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("Produk").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("Produk").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const urls = [];
      for (const file of files) urls.push(await uploadFile(file, store.id));
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      alert("Gagal upload foto: " + err.message);
    }
    setUploadingPhoto(false);
    e.target.value = "";
  }

  function hapusFoto(index) {
    setImages(images.filter((_, i) => i !== index));
  }

  async function handleVideoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      setVideoUrl(await uploadFile(file, store.id));
    } catch (err) {
      alert("Gagal upload video: " + err.message);
    }
    setUploadingVideo(false);
    e.target.value = "";
  }

  function updateVariant(index, field, value) {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  }

  function addVariantRow() {
    setVariants([...variants, { name: "", sku: "", price: "", stock: "" }]);
  }

  function removeVariantRow(index) {
    setVariants(variants.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (images.length === 0) {
      alert("Produk minimal harus punya 1 foto.");
      return;
    }
    setSaving(true);

    const payload = {
      name,
      description,
      category,
      sku: sku || null,
      weight: parseInt(weight || 500),
      price: adaVarian ? (variants[0]?.price || 0) : parseInt(price || 0),
      stock: adaVarian ? variants.reduce((sum, v) => sum + parseInt(v.stock || 0), 0) : parseInt(stock || 0),
      images,
      video_url: videoUrl || null,
      variants: adaVarian
        ? variants.map((v) => ({ name: v.name, sku: v.sku || null, price: parseInt(v.price || 0), stock: parseInt(v.stock || 0) }))
        : [],
    };

    const { error } = await supabase.from("products").update(payload).eq("id", productId);
    setSaving(false);

    if (error) alert("Gagal simpan perubahan: " + error.message);
    else window.location.href = "/dashboard/produk";
  }

  async function handleDelete() {
    if (!confirm(`Yakin mau hapus produk "${name}"? Produk yang udah pernah dipesan tetap aman di riwayat pesanan, tapi produk ini gak akan muncul lagi di toko.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("products").delete().eq("id", productId);
    setDeleting(false);
    if (error) alert("Gagal hapus produk: " + error.message);
    else window.location.href = "/dashboard/produk";
  }

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#FAFAF7] flex flex-col items-center justify-center gap-3">
        <p className="text-[#8B8D85]">Produk gak ketemu.</p>
        <a href="/dashboard/produk" className="text-sm text-[#D85A30] hover:underline">Balik ke daftar produk</a>
      </main>
    );
  }

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/produk" headerTitle="Edit produk">
            <div className="max-w-xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1C1C1A]">Edit produk</h1>
          <button onClick={handleDelete} disabled={deleting} className="text-sm text-[#A32D2D] hover:underline disabled:opacity-50">
            {deleting ? "Menghapus..." : "Hapus produk"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-[#E5E2D9] p-6">
          <div>
            <label className="text-sm text-[#5B6472] block mb-1">Nama produk</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>

          <div>
            <label className="text-sm text-[#5B6472] block mb-1">Deskripsi</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#5B6472] block mb-1">Kategori</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
            </div>
            <div>
              <label className="text-sm text-[#5B6472] block mb-1">SKU induk (opsional)</label>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)}
                className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
            </div>
          </div>

          <div>
            <label className="text-sm text-[#5B6472] block mb-1">
              Berat produk (gram) <span className="text-[#8B8D85] font-normal">— dipakai buat hitung ongkir</span>
            </label>
            <input type="number" required min="1" value={weight} onChange={(e) => setWeight(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>

          <div>
            <label className="text-sm text-[#5B6472] block mb-2">Foto produk</label>
            <div className="flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#E5E2D9] group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => hapusFoto(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} className="text-white" />
                  </button>
                  {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5">Utama</span>}
                </div>
              ))}
              <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-[#E5E2D9] flex flex-col items-center justify-center text-[#8B8D85] hover:border-[#D85A30] hover:text-[#D85A30] transition-colors disabled:opacity-50">
                <Upload size={16} />
                <span className="text-[10px] mt-1">{uploadingPhoto ? "..." : "Tambah"}</span>
              </button>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
          </div>

          <div>
            <label className="text-sm text-[#5B6472] block mb-2">Video produk (opsional)</label>
            {videoUrl ? (
              <div className="flex items-center gap-3">
                <video src={videoUrl} className="w-28 h-20 rounded-lg object-cover border border-[#E5E2D9]" controls />
                <button type="button" onClick={() => setVideoUrl("")} className="text-xs text-[#A32D2D] hover:underline">Hapus video</button>
              </div>
            ) : (
              <button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}
                className="flex items-center gap-2 text-sm text-[#D85A30] hover:underline disabled:opacity-50">
                <Video size={15} /> {uploadingVideo ? "Mengupload..." : "Upload video dari device"}
              </button>
            )}
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="adaVarian" checked={adaVarian} onChange={(e) => setAdaVarian(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="adaVarian" className="text-sm text-[#5B6472]">Produk ini punya varian (ukuran, warna, dll)</label>
          </div>

          {!adaVarian ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#5B6472] block mb-1">Harga</label>
                <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
              </div>
              <div>
                <label className="text-sm text-[#5B6472] block mb-1">Stok</label>
                <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm text-[#5B6472] block">Varian</label>
              {variants.map((v, i) => (
                <div key={i} className="flex gap-2 items-start flex-wrap">
                  <input type="text" placeholder="Merah - M" value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)}
                    className="flex-1 min-w-[100px] px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
                  <input type="text" placeholder="Kode SKU" value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)}
                    className="w-24 px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
                  <input type="number" placeholder="Harga" value={v.price} onChange={(e) => updateVariant(i, "price", e.target.value)}
                    className="w-24 px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
                  <input type="number" placeholder="Stok" value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)}
                    className="w-20 px-3 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariantRow(i)} className="text-[#A32D2D] text-sm px-2">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addVariantRow} className="text-sm text-[#D85A30] font-medium">+ Tambah varian</button>
            </div>
          )}

          <button type="submit" disabled={saving || uploadingPhoto || uploadingVideo}
            className="w-full py-3 bg-[#D85A30] text-white rounded-lg font-medium hover:bg-[#B84A25] transition-colors disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
