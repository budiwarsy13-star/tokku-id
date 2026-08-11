"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";
import { LayoutDashboard, Package, ShoppingBag, Store, LogOut, Tag, Plus, Trash2, X } from "lucide-react";

export default function DiskonPage() {
  const [store, setStore] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      await fetchCodes(storeData.id);
      setLoading(false);
    }
    init();
  }, []);

  async function fetchCodes(storeId) {
    const { data } = await supabase
      .from("discount_codes").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setCodes(data || []);
  }

  async function hapusKode(id) {
    if (!confirm("Yakin mau hapus kode diskon ini?")) return;
    await supabase.from("discount_codes").delete().eq("id", id);
    fetchCodes(store.id);
  }

  async function toggleAktif(code) {
    await supabase.from("discount_codes").update({ is_active: !code.is_active }).eq("id", code.id);
    fetchCodes(store.id);
  }

  const menuItems = [
    { icon: LayoutDashboard, label: "Ringkasan", href: "/dashboard" },
    { icon: Package, label: "Produk", href: "/dashboard/produk" },
    { icon: ShoppingBag, label: "Pesanan", href: "/dashboard/pesanan" },
    { icon: Tag, label: "Diskon", href: "/dashboard/diskon", active: true },
    { icon: Store, label: "Pengaturan toko", href: "/dashboard/toko" },
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
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

      <div className="flex-1 ml-60 p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#1C1C1A]">Kode diskon</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#D85A30] text-white rounded-lg text-sm font-medium hover:bg-[#B84A25] transition-colors">
              <Plus size={16} /> Buat kode baru
            </button>
            <NotificationBell storeId={store.id} />
          </div>
        </div>

        {codes.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-10 text-center">
            <Tag size={28} className="mx-auto mb-3 text-[#8B8D85]" />
            <p className="text-sm text-[#8B8D85] mb-1">Belum ada kode diskon.</p>
            <p className="text-xs text-[#8B8D85]">Bikin kode voucher buat narik pembeli, misal "DISKON10" atau "ONGKIRGRATIS".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((c) => {
              const kedaluwarsa = c.expires_at && new Date(c.expires_at) < new Date();
              const habis = c.usage_limit !== null && c.used_count >= c.usage_limit;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-[#E5E2D9] p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-[#1C1C1A] bg-[#F1EFE8] px-2 py-0.5 rounded">{c.code}</span>
                      {!c.is_active && <span className="text-xs bg-[#F1EFE8] text-[#5B6472] px-2 py-0.5 rounded-full">Nonaktif</span>}
                      {kedaluwarsa && <span className="text-xs bg-[#FBEAEA] text-[#A32D2D] px-2 py-0.5 rounded-full">Kedaluwarsa</span>}
                      {habis && <span className="text-xs bg-[#FAEEDA] text-[#854F0B] px-2 py-0.5 rounded-full">Batas tercapai</span>}
                    </div>
                    <p className="text-sm text-[#5B6472]">
                      {c.type === "percentage" ? `Diskon ${c.value}%` : `Diskon Rp${Number(c.value).toLocaleString("id-ID")}`}
                      {c.min_purchase > 0 && ` · Min. belanja Rp${Number(c.min_purchase).toLocaleString("id-ID")}`}
                    </p>
                    <p className="text-xs text-[#8B8D85] mt-1">
                      Dipakai {c.used_count}{c.usage_limit !== null ? `/${c.usage_limit}` : ""} kali
                      {c.expires_at && ` · Berlaku sampai ${new Date(c.expires_at).toLocaleDateString("id-ID")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAktif(c)}
                      className="text-xs text-[#5B6472] hover:underline">
                      {c.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button onClick={() => hapusKode(c.id)} className="p-2 text-[#A32D2D] hover:bg-[#FBEAEA] rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <FormKodeDiskon
          store={store}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchCodes(store.id); }}
        />
      )}
    </main>
  );
}

function FormKodeDiskon({ store, onClose, onSaved }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!code.trim()) return setError("Kode diskon wajib diisi.");
    if (!value || Number(value) <= 0) return setError("Nilai diskon wajib diisi.");
    if (type === "percentage" && Number(value) > 100) return setError("Diskon persen maksimal 100%.");

    setSaving(true);
    const { error: insertError } = await supabase.from("discount_codes").insert({
      store_id: store.id,
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      min_purchase: minPurchase ? Number(minPurchase) : 0,
      usage_limit: usageLimit ? Number(usageLimit) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "Kode ini udah dipakai, coba yang lain." : insertError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-6">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#E5E2D9] sticky top-0 bg-white">
          <h2 className="font-bold text-[#1C1C1A]">Buat kode diskon</h2>
          <button onClick={onClose} className="text-[#8B8D85] hover:text-[#1C1C1A]"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="bg-[#FBEAEA] text-[#A32D2D] text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Kode</label>
            <input type="text" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: DISKON10"
              className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm font-mono focus:outline-none focus:border-[#D85A30]" />
          </div>

          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Jenis diskon</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType("percentage")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border ${type === "percentage" ? "bg-[#D85A30] text-white border-[#D85A30]" : "border-[#E5E2D9] text-[#5B6472]"}`}>
                Persen (%)
              </button>
              <button type="button" onClick={() => setType("fixed")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border ${type === "fixed" ? "bg-[#D85A30] text-white border-[#D85A30]" : "border-[#E5E2D9] text-[#5B6472]"}`}>
                Nominal (Rp)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">
              Nilai diskon {type === "percentage" ? "(%)" : "(Rp)"}
            </label>
            <input type="number" required min={1} max={type === "percentage" ? 100 : undefined} value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "percentage" ? "Contoh: 10" : "Contoh: 20000"}
              className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>

          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">
              Minimal belanja <span className="text-[#8B8D85] normal-case font-normal">(opsional)</span>
            </label>
            <input type="number" min={0} value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)}
              placeholder="Rp0"
              className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>

          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">
              Batas pemakaian <span className="text-[#8B8D85] normal-case font-normal">(opsional, kosongkan buat unlimited)</span>
            </label>
            <input type="number" min={1} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Contoh: 50"
              className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>

          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">
              Berlaku sampai <span className="text-[#8B8D85] normal-case font-normal">(opsional)</span>
            </label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-[#D85A30] text-white rounded-xl font-medium hover:bg-[#B84A25] transition-colors disabled:opacity-50">
            {saving ? "Menyimpan..." : "Buat kode diskon"}
          </button>
        </form>
      </div>
    </div>
  );
}