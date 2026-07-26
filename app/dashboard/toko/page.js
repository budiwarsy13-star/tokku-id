"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { LayoutDashboard, Package, ShoppingBag, Store, LogOut, Search, Upload, Palette, Eye } from "lucide-react";

export default function PengaturanToko() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [activeTab, setActiveTab] = useState("alamat");

  // Appearance state
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState("#D85A30");
  const [bannerUploading, setBannerUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const bannerRef = useRef();
  const logoRef = useRef();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      setDescription(storeData.description || "");
      setAccentColor(storeData.accent_color || "#D85A30");
      setLoading(false);
    }
    init();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!keyword) return;
    setSearching(true);
    const res = await fetch(`/api/rajaongkir/search?keyword=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    setResults(data.data || []);
    setSearching(false);
  }

  async function pilihAlamat(lokasi) {
    setSaving(true);
    const { error } = await supabase.from("stores")
      .update({ origin_id: String(lokasi.id), origin_label: lokasi.label })
      .eq("id", store.id);
    setSaving(false);
    if (!error) {
      setStore({ ...store, origin_id: String(lokasi.id), origin_label: lokasi.label });
      setResults([]); setKeyword("");
      showMsg("Alamat asal berhasil disimpan!");
    }
  }

  function showMsg(msg) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 3000);
  }

  async function uploadImage(file, bucket, field, setUploading) {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${store.id}/${field}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (upErr) { alert("Gagal upload: " + upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    const { error: dbErr } = await supabase.from("stores").update({ [field]: publicUrl }).eq("id", store.id);
    if (!dbErr) {
      setStore((prev) => ({ ...prev, [field]: publicUrl }));
      showMsg("Gambar berhasil disimpan!");
    }
    setUploading(false);
  }

  async function saveAppearance() {
    setSaving(true);
    const { error } = await supabase.from("stores")
      .update({ description, accent_color: accentColor })
      .eq("id", store.id);
    setSaving(false);
    if (!error) {
      setStore((prev) => ({ ...prev, description, accent_color: accentColor }));
      showMsg("Tampilan toko berhasil disimpan!");
    }
  }

  const menuItems = [
    { icon: LayoutDashboard, label: "Ringkasan", href: "/dashboard" },
    { icon: Package, label: "Produk", href: "/dashboard/produk" },
    { icon: ShoppingBag, label: "Pesanan", href: "/dashboard/pesanan" },
    { icon: Store, label: "Pengaturan toko", href: "/dashboard/toko", active: true },
  ];

  const ACCENT_PRESETS = [
    "#D85A30", "#1C1C1A", "#3B6D11", "#2C5F8A", "#7B3FA0", "#B8860B", "#A32D2D",
  ];

  if (loading) return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <p className="text-[#8B8D85]">Memuat...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#FAFAF7] flex">
      <aside className="w-60 bg-white border-r border-[#E5E2D9] flex flex-col fixed h-screen">
        <div className="px-6 py-5 border-b border-[#E5E2D9]">
          <span className="font-bold text-xl tracking-tight text-[#1C1C1A]">
            tok<span className="text-[#D85A30]">k</span>u<span className="text-[#8B8D85] font-normal">.id</span>
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <a key={item.label} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                item.active ? "bg-[#FAECE7] text-[#D85A30] font-medium" : "text-[#5B6472] hover:bg-[#F1EFE8]"
              }`}>
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-[#E5E2D9]">
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#5B6472] hover:bg-[#F1EFE8] w-full">
            <LogOut size={18} strokeWidth={1.75} /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-60 p-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#1C1C1A]">Pengaturan toko</h1>
          <a href={`/${store.slug}`} target="_blank"
            className="flex items-center gap-2 text-sm text-[#D85A30] hover:underline">
            <Eye size={15} /> Lihat toko
          </a>
        </div>

        {savedMsg && (
          <div className="bg-[#EAF1E8] text-[#3B6D11] text-sm px-4 py-3 rounded-lg mb-5">
            {savedMsg}
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-1 mb-6 bg-white border border-[#E5E2D9] rounded-xl p-1">
          {[
            { id: "alamat", label: "📍 Alamat Kirim" },
            { id: "tampilan", label: "🎨 Tampilan Toko" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-[#D85A30] text-white" : "text-[#5B6472] hover:bg-[#F1EFE8]"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: ALAMAT */}
        {activeTab === "alamat" && (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
            <h2 className="font-bold text-[#1C1C1A] mb-1">Alamat asal pengiriman</h2>
            <p className="text-sm text-[#8B8D85] mb-4">
              Dipakai buat hitung ongkir otomatis dari toko kamu ke alamat pembeli.
            </p>
            {store.origin_label && (
              <div className="bg-[#EAF1E8] text-[#3B6D11] text-sm px-4 py-3 rounded-lg mb-4">
                Alamat aktif: <strong>{store.origin_label}</strong>
              </div>
            )}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari kecamatan/kota, misal: Kemayoran"
                className="flex-1 px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
              />
              <button type="submit" disabled={searching}
                className="px-4 py-2 bg-[#D85A30] text-white rounded-lg text-sm hover:bg-[#B84A25] disabled:opacity-50">
                <Search size={16} />
              </button>
            </form>
            {results.length > 0 && (
              <div className="border border-[#E5E2D9] rounded-lg divide-y divide-[#F1EFE8] max-h-64 overflow-y-auto">
                {results.map((r) => (
                  <button key={r.id} onClick={() => pilihAlamat(r)} disabled={saving}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-[#FAFAF7]">
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: TAMPILAN */}
        {activeTab === "tampilan" && (
          <div className="space-y-4">

            {/* BANNER */}
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
              <h2 className="font-bold text-[#1C1C1A] mb-1">Foto banner toko</h2>
              <p className="text-sm text-[#8B8D85] mb-4">Tampil di bagian atas halaman toko. Rekomendasi ukuran 1200×400px.</p>
              <div
                className="w-full h-36 rounded-lg overflow-hidden mb-3 cursor-pointer border-2 border-dashed border-[#E5E2D9] hover:border-[#D85A30] transition-colors flex items-center justify-center"
                style={{ background: store.banner_url ? "transparent" : "#F1EFE8" }}
                onClick={() => bannerRef.current?.click()}
              >
                {store.banner_url ? (
                  <img src={store.banner_url} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload size={24} className="mx-auto mb-2 text-[#8B8D85]" />
                    <p className="text-sm text-[#8B8D85]">Klik untuk upload banner</p>
                  </div>
                )}
              </div>
              <input ref={bannerRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => uploadImage(e.target.files[0], "Banner", "banner_url", setBannerUploading)} />
              <button onClick={() => bannerRef.current?.click()} disabled={bannerUploading}
                className="text-sm text-[#D85A30] hover:underline disabled:opacity-50">
                {bannerUploading ? "Mengupload..." : store.banner_url ? "Ganti banner" : "Upload banner"}
              </button>
            </div>

            {/* LOGO */}
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
              <h2 className="font-bold text-[#1C1C1A] mb-1">Logo toko</h2>
              <p className="text-sm text-[#8B8D85] mb-4">Tampil di header toko. Rekomendasi ukuran 200×200px, format PNG transparan.</p>
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-[#E5E2D9] hover:border-[#D85A30] cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
                  style={{ background: "#F1EFE8" }}
                  onClick={() => logoRef.current?.click()}
                >
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={20} className="text-[#8B8D85]" />
                  )}
                </div>
                <div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => uploadImage(e.target.files[0], "Logos", "logo_url", setLogoUploading)} />
                  <button onClick={() => logoRef.current?.click()} disabled={logoUploading}
                    className="block text-sm text-[#D85A30] hover:underline disabled:opacity-50">
                    {logoUploading ? "Mengupload..." : store.logo_url ? "Ganti logo" : "Upload logo"}
                  </button>
                  <p className="text-xs text-[#8B8D85] mt-1">Opsional</p>
                </div>
              </div>
            </div>

            {/* DESKRIPSI */}
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
              <h2 className="font-bold text-[#1C1C1A] mb-1">Deskripsi toko</h2>
              <p className="text-sm text-[#8B8D85] mb-3">Tampil di bawah nama toko. Singkat, 1-2 kalimat aja.</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={150}
                placeholder="Contoh: Brand streetwear premium asal Bekasi. Kualitas bahan terbaik, desain buat lo yang berani tampil beda."
                className="w-full px-4 py-3 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30] resize-none"
              />
              <p className="text-xs text-[#8B8D85] mt-1 text-right">{description.length}/150</p>
            </div>

            {/* WARNA AKSEN */}
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
              <h2 className="font-bold text-[#1C1C1A] mb-1">Warna aksen toko</h2>
              <p className="text-sm text-[#8B8D85] mb-4">Warna tombol dan highlight di halaman toko kamu.</p>
              <div className="flex items-center gap-3 flex-wrap mb-4">
                {ACCENT_PRESETS.map((c) => (
                  <button key={c} onClick={() => setAccentColor(c)}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: c,
                      outline: accentColor === c ? `3px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border border-[#E5E2D9]"
                  title="Pilih warna custom"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg" style={{ background: accentColor }} />
                <span className="text-sm font-mono text-[#5B6472]">{accentColor}</span>
                <button
                  className="ml-auto px-4 py-2 text-white text-sm rounded-lg"
                  style={{ background: accentColor }}
                  disabled
                >
                  Preview tombol
                </button>
              </div>
            </div>

            <button onClick={saveAppearance} disabled={saving}
              className="w-full py-3 bg-[#D85A30] text-white rounded-xl font-medium hover:bg-[#B84A25] transition-colors disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan tampilan toko"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}