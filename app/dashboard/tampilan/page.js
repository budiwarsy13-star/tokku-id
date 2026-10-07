"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { DEFAULT_THEME, mergeTheme, FONTS } from "@/lib/theme";
import { Check, Eye, Save, RotateCcw, ExternalLink } from "lucide-react";

const HEADER_STYLES  = [
  { value: "banner",   label: "Banner Penuh",  desc: "Foto banner tampil besar di atas" },
  { value: "simple",   label: "Simpel",        desc: "Logo + nama toko tanpa banner" },
  { value: "centered", label: "Terpusat",      desc: "Semua elemen header di tengah" },
];
const CARD_STYLES = [
  { value: "clean",    label: "Bersih" },
  { value: "shadow",   label: "Bayangan" },
  { value: "bordered", label: "Berbingkai" },
];
const TEXT_POSITIONS = ["left","center","right"];
const GRID_OPTIONS   = [
  { value: "2",    label: "2 Kolom" },
  { value: "3",    label: "3 Kolom" },
  { value: "auto", label: "Otomatis" },
];
const IMAGE_RATIOS = [
  { value: "square",   label: "Kotak (1:1)" },
  { value: "portrait", label: "Portrait (3:4)" },
];
const ACCENT_PRESETS = [
  "#D85A30","#1C1C1A","#2563EB","#7C3AED","#059669","#B8860B","#DC2626","#0891B2",
];

export default function TampilanToko() {
  const [store,   setStore]   = useState(null);
  const [theme,   setTheme]   = useState(DEFAULT_THEME);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [section, setSection] = useState("layout");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: s } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!s) return;
      setStore(s);
      setTheme(mergeTheme(s.theme_config || {}));
    }
    init();
  }, []);

  function set(path, value) {
    setTheme(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }

  async function handleSave() {
    if (!store) return;
    setSaving(true);
    await supabase.from("stores").update({ theme_config: theme }).eq("id", store.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    if (!confirm("Reset ke tampilan default?")) return;
    setTheme(mergeTheme({}));
  }

  if (!store) return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <p className="text-[#8B8D85]">Memuat...</p>
    </main>
  );

  const fontImport = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.typography.fontFamily)}:wght@400;600;700;900&display=swap`;

  const SECTIONS = [
    { key: "layout",     label: "🏗️  Layout" },
    { key: "header",     label: "🖼️  Header" },
    { key: "typography", label: "✏️  Tipografi" },
    { key: "colors",     label: "🎨  Warna" },
    { key: "product",    label: "🛍️  Produk" },
  ];

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/tampilan" headerTitle="Kustomisasi Tampilan Toko">
      <link rel="stylesheet" href={fontImport} />

      <div className="flex gap-6 items-start">
        {/* ── LEFT: Editor Panel ── */}
        <div className="w-80 flex-shrink-0 space-y-3">

          {/* Section tabs */}
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-1.5 flex flex-wrap gap-1">
            {SECTIONS.map(s => (
              <button key={s.key} onClick={() => setSection(s.key)}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  section === s.key ? "bg-[#1C1C1A] text-white" : "text-[#5B6472] hover:bg-[#F1EFE8]"
                }`}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 space-y-5">

            {/* ── LAYOUT ── */}
            {section === "layout" && (
              <>
                <h3 className="font-bold text-[#1C1C1A]">Layout halaman</h3>
                {[
                  { value:"classic", label:"Klasik", desc:"Header → Deskripsi → Produk" },
                  { value:"minimal", label:"Minimal", desc:"Logo kecil, langsung produk" },
                  { value:"bold",    label:"Bold",    desc:"Header besar, nama toko jumbo" },
                ].map(o => (
                  <label key={o.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${theme.layout===o.value?"border-[#1C1C1A] bg-[#F1EFE8]":"border-[#E5E2D9]"}`}>
                    <input type="radio" name="layout" value={o.value} checked={theme.layout===o.value}
                      onChange={() => set("layout", o.value)} className="mt-0.5 accent-[#1C1C1A]" />
                    <div>
                      <p className="text-sm font-semibold text-[#1C1C1A]">{o.label}</p>
                      <p className="text-xs text-[#8B8D85]">{o.desc}</p>
                    </div>
                  </label>
                ))}

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Background toko</p>
                  <div className="flex gap-2 flex-wrap">
                    {["#FAFAF7","#FFFFFF","#1C1C1A","#0F172A","#F5F0E8","#E8F0FA"].map(c => (
                      <button key={c} onClick={() => set("colors.background", c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${theme.colors.background===c?"border-[#D85A30] scale-110":"border-white shadow"}`}
                        style={{ background: c }} />
                    ))}
                    <input type="color" value={theme.colors.background}
                      onChange={e => set("colors.background", e.target.value)}
                      className="w-8 h-8 rounded-full cursor-pointer border border-[#E5E2D9]" title="Warna custom" />
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-[#1C1C1A]">Tampilkan deskripsi toko</span>
                    <input type="checkbox" checked={theme.sections.showDescription}
                      onChange={e => set("sections.showDescription", e.target.checked)}
                      className="w-4 h-4 accent-[#D85A30]" />
                  </label>
                </div>
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-[#1C1C1A]">Tampilkan promo banner</span>
                    <input type="checkbox" checked={theme.sections.showPromoCarousel}
                      onChange={e => set("sections.showPromoCarousel", e.target.checked)}
                      className="w-4 h-4 accent-[#D85A30]" />
                  </label>
                </div>
              </>
            )}

            {/* ── HEADER ── */}
            {section === "header" && (
              <>
                <h3 className="font-bold text-[#1C1C1A]">Gaya header</h3>
                {HEADER_STYLES.map(o => (
                  <label key={o.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${theme.header.style===o.value?"border-[#1C1C1A] bg-[#F1EFE8]":"border-[#E5E2D9]"}`}>
                    <input type="radio" name="hstyle" value={o.value} checked={theme.header.style===o.value}
                      onChange={() => set("header.style", o.value)} className="mt-0.5 accent-[#1C1C1A]" />
                    <div>
                      <p className="text-sm font-semibold text-[#1C1C1A]">{o.label}</p>
                      <p className="text-xs text-[#8B8D85]">{o.desc}</p>
                    </div>
                  </label>
                ))}

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Tinggi header</p>
                  <div className="flex gap-2">
                    {[{v:"sm",l:"Kecil"},{v:"md",l:"Sedang"},{v:"lg",l:"Besar"}].map(o => (
                      <button key={o.v} onClick={() => set("header.height", o.v)}
                        className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${theme.header.height===o.v?"border-[#1C1C1A] bg-[#1C1C1A] text-white":"border-[#E5E2D9] text-[#5B6472]"}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Posisi teks</p>
                  <div className="flex gap-2">
                    {TEXT_POSITIONS.map(p => (
                      <button key={p} onClick={() => set("header.textPosition", p)}
                        className={`flex-1 py-2 text-xs rounded-lg border font-medium capitalize transition-colors ${theme.header.textPosition===p?"border-[#1C1C1A] bg-[#1C1C1A] text-white":"border-[#E5E2D9] text-[#5B6472]"}`}>
                        {p === "left" ? "Kiri" : p === "center" ? "Tengah" : "Kanan"}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between">
                  <span className="text-sm text-[#1C1C1A]">Overlay gelap di banner</span>
                  <input type="checkbox" checked={theme.header.overlay}
                    onChange={e => set("header.overlay", e.target.checked)}
                    className="w-4 h-4 accent-[#D85A30]" />
                </label>
              </>
            )}

            {/* ── TYPOGRAPHY ── */}
            {section === "typography" && (
              <>
                <h3 className="font-bold text-[#1C1C1A]">Font toko</h3>
                <div className="space-y-2">
                  {FONTS.map(f => (
                    <label key={f.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${theme.typography.fontFamily===f.value?"border-[#1C1C1A] bg-[#F1EFE8]":"border-[#E5E2D9]"}`}>
                      <input type="radio" name="font" value={f.value} checked={theme.typography.fontFamily===f.value}
                        onChange={() => set("typography.fontFamily", f.value)} className="accent-[#1C1C1A]" />
                      <div>
                        <p className="text-sm font-semibold" style={{ fontFamily: f.value }}>{f.label}</p>
                        <p className="text-xs text-[#8B8D85]">{f.vibe}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Ukuran nama toko</p>
                  <div className="flex gap-1">
                    {[{v:"sm",l:"S"},{v:"md",l:"M"},{v:"lg",l:"L"},{v:"xl",l:"XL"}].map(o => (
                      <button key={o.v} onClick={() => set("typography.titleSize", o.v)}
                        className={`flex-1 py-2 text-xs rounded-lg border font-bold transition-colors ${theme.typography.titleSize===o.v?"border-[#1C1C1A] bg-[#1C1C1A] text-white":"border-[#E5E2D9] text-[#5B6472]"}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Ketebalan teks</p>
                  <div className="flex gap-2">
                    {[{v:"normal",l:"Normal"},{v:"bold",l:"Bold"},{v:"black",l:"Black"}].map(o => (
                      <button key={o.v} onClick={() => set("typography.titleWeight", o.v)}
                        className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${theme.typography.titleWeight===o.v?"border-[#1C1C1A] bg-[#1C1C1A] text-white":"border-[#E5E2D9] text-[#5B6472]"}`}
                        style={{ fontWeight: o.v === "normal" ? 400 : o.v === "bold" ? 700 : 900 }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── COLORS ── */}
            {section === "colors" && (
              <>
                <h3 className="font-bold text-[#1C1C1A]">Warna toko</h3>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Warna aksen (tombol & highlight)</p>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {ACCENT_PRESETS.map(c => (
                      <button key={c} onClick={() => set("colors.accent", c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${theme.colors.accent===c?"border-[#D85A30] scale-110":"border-white shadow"}`}
                        style={{ background: c }} />
                    ))}
                    <input type="color" value={theme.colors.accent}
                      onChange={e => set("colors.accent", e.target.value)}
                      className="w-8 h-8 rounded-full cursor-pointer border border-[#E5E2D9]" />
                  </div>
                  <p className="text-xs font-mono text-[#8B8D85]">{theme.colors.accent}</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Warna permukaan kartu</p>
                  <div className="flex gap-2 flex-wrap">
                    {["#FFFFFF","#F9F7F5","#1C1C1A","#0F172A","#F0EBE3"].map(c => (
                      <button key={c} onClick={() => set("colors.surface", c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${theme.colors.surface===c?"border-[#D85A30] scale-110":"border-[#E5E2D9] shadow"}`}
                        style={{ background: c }} />
                    ))}
                    <input type="color" value={theme.colors.surface}
                      onChange={e => set("colors.surface", e.target.value)}
                      className="w-8 h-8 rounded-full cursor-pointer border border-[#E5E2D9]" />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Warna teks utama</p>
                  <div className="flex gap-2 flex-wrap">
                    {["#1C1C1A","#FFFFFF","#374151","#6B7280"].map(c => (
                      <button key={c} onClick={() => set("colors.text", c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${theme.colors.text===c?"border-[#D85A30] scale-110":"border-[#E5E2D9] shadow"}`}
                        style={{ background: c }} />
                    ))}
                    <input type="color" value={theme.colors.text}
                      onChange={e => set("colors.text", e.target.value)}
                      className="w-8 h-8 rounded-full cursor-pointer border border-[#E5E2D9]" />
                  </div>
                </div>

                {/* Preview mini */}
                <div className="rounded-xl overflow-hidden border border-[#E5E2D9]">
                  <div className="p-3 text-center" style={{ background: theme.colors.accent }}>
                    <p className="text-white text-xs font-bold" style={{ fontFamily: theme.typography.fontFamily }}>
                      {store.name}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: theme.colors.surface }}>
                    <div className="h-8 rounded" style={{ background: theme.colors.background }} />
                    <button className="mt-2 w-full py-1.5 rounded text-xs font-bold text-white"
                      style={{ background: theme.colors.accent }}>
                      Beli Sekarang
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── PRODUCT ── */}
            {section === "product" && (
              <>
                <h3 className="font-bold text-[#1C1C1A]">Tampilan produk</h3>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Grid kolom</p>
                  <div className="flex gap-2">
                    {GRID_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => set("product.grid", o.value)}
                        className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${theme.product.grid===o.value?"border-[#1C1C1A] bg-[#1C1C1A] text-white":"border-[#E5E2D9] text-[#5B6472]"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Gaya kartu produk</p>
                  {CARD_STYLES.map(o => (
                    <label key={o.value} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer mb-2 transition-all ${theme.product.cardStyle===o.value?"border-[#1C1C1A] bg-[#F1EFE8]":"border-[#E5E2D9]"}`}>
                      <input type="radio" name="cardstyle" value={o.value} checked={theme.product.cardStyle===o.value}
                        onChange={() => set("product.cardStyle", o.value)} className="accent-[#1C1C1A]" />
                      <span className="text-sm text-[#1C1C1A]">{o.label}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-2">Rasio gambar produk</p>
                  <div className="flex gap-2">
                    {IMAGE_RATIOS.map(o => (
                      <button key={o.value} onClick={() => set("product.imageRatio", o.value)}
                        className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${theme.product.imageRatio===o.value?"border-[#1C1C1A] bg-[#1C1C1A] text-white":"border-[#E5E2D9] text-[#5B6472]"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between">
                  <span className="text-sm text-[#1C1C1A]">Tampilkan harga di kartu</span>
                  <input type="checkbox" checked={theme.product.showPrice}
                    onChange={e => set("product.showPrice", e.target.checked)}
                    className="w-4 h-4 accent-[#D85A30]" />
                </label>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="flex-shrink-0 p-2.5 rounded-xl border border-[#E5E2D9] text-[#8B8D85] hover:bg-[#F1EFE8] transition-colors"
              title="Reset ke default">
              <RotateCcw size={16} />
            </button>
            <a href={`/${store.slug}`} target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E2D9] text-sm text-[#5B6472] hover:bg-[#F1EFE8] transition-colors">
              <Eye size={15} /> Preview
            </a>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1C1C1A] text-white text-sm font-bold hover:bg-[#2C2C2A] transition-colors disabled:opacity-50">
              {saved ? <><Check size={15} /> Tersimpan!</> : saving ? "Menyimpan..." : <><Save size={15} /> Simpan</>}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="flex-1 min-w-0">
          <div className="sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider">Preview Langsung</p>
              <a href={`/${store.slug}`} target="_blank"
                className="flex items-center gap-1 text-xs text-[#D85A30] hover:underline">
                <ExternalLink size={12} /> Buka di tab baru
              </a>
            </div>

            {/* Browser chrome mockup */}
            <div className="rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-lg">
              <div className="bg-[#F1EFE8] px-4 py-2 flex items-center gap-2 border-b border-[#E5E2D9]">
                <div className="flex gap-1.5">
                  {["#FF5F57","#FEBC2E","#28C840"].map(c => (
                    <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-[#8B8D85] font-mono">
                  tokku.id/{store.slug}
                </div>
              </div>

              {/* Storefront preview */}
              <div style={{
                background: theme.colors.background,
                fontFamily: theme.typography.fontFamily,
                minHeight: 400,
                color: theme.colors.text,
              }}>
                {/* Header preview */}
                {theme.header.style === "banner" && store.banner_url ? (
                  <div className={`relative w-full overflow-hidden ${
                    theme.header.height === "sm" ? "h-24" : theme.header.height === "lg" ? "h-48" : "h-36"
                  }`}>
                    <img src={store.banner_url} alt="" className="w-full h-full object-cover" />
                    {theme.header.overlay && (
                      <div className="absolute inset-0 bg-black/40" />
                    )}
                    <div className={`absolute inset-0 flex items-end p-4 ${
                      theme.header.textPosition === "center" ? "justify-center text-center" :
                      theme.header.textPosition === "right"  ? "justify-end  text-right"  : "justify-start text-left"
                    }`}>
                      <h1 className="text-white" style={{
                        fontSize: theme.typography.titleSize === "sm" ? 16 : theme.typography.titleSize === "md" ? 20 : theme.typography.titleSize === "xl" ? 30 : 24,
                        fontWeight: theme.typography.titleWeight === "normal" ? 400 : theme.typography.titleWeight === "black" ? 900 : 700,
                      }}>
                        {store.name}
                      </h1>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 px-4 py-4 ${
                    theme.header.style === "centered" ? "flex-col text-center justify-center" : ""
                  }`} style={{ background: theme.colors.surface }}>
                    {store.logo_url && (
                      <img src={store.logo_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    )}
                    <h1 style={{
                      fontSize: theme.typography.titleSize === "sm" ? 14 : theme.typography.titleSize === "md" ? 18 : theme.typography.titleSize === "xl" ? 28 : 22,
                      fontWeight: theme.typography.titleWeight === "normal" ? 400 : theme.typography.titleWeight === "black" ? 900 : 700,
                      color: theme.colors.text,
                    }}>
                      {store.name}
                    </h1>
                  </div>
                )}

                {/* Description preview */}
                {theme.sections.showDescription && store.description && (
                  <p className="px-4 py-2 text-xs" style={{ color: `${theme.colors.text}99` }}>
                    {store.description}
                  </p>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="flex-1 h-px" style={{ background: `${theme.colors.text}20` }} />
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: `${theme.colors.text}60` }}>Produk</span>
                  <div className="flex-1 h-px" style={{ background: `${theme.colors.text}20` }} />
                </div>

                {/* Product grid preview */}
                <div className={`grid gap-3 p-4 ${
                  theme.product.grid === "3" ? "grid-cols-3" : theme.product.grid === "auto" ? "grid-cols-3" : "grid-cols-2"
                }`}>
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`rounded-xl overflow-hidden ${
                      theme.product.cardStyle === "shadow"   ? "shadow-md" :
                      theme.product.cardStyle === "bordered" ? "border-2" : "border"
                    }`}
                    style={{
                      background: theme.colors.surface,
                      borderColor: theme.product.cardStyle === "bordered" ? theme.colors.accent : `${theme.colors.text}15`,
                    }}>
                      <div className={`w-full ${theme.product.imageRatio === "portrait" ? "aspect-[3/4]" : "aspect-square"}`}
                        style={{ background: `${theme.colors.accent}22` }} />
                      <div className="p-2">
                        <div className="h-2 rounded w-3/4 mb-1.5" style={{ background: `${theme.colors.text}20` }} />
                        {theme.product.showPrice && (
                          <div className="h-2 rounded w-1/2" style={{ background: theme.colors.accent + "88" }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
