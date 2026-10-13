"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationBell from "@/components/NotificationBell";
import { Save, Bell, Store, Globe } from "lucide-react";

export default function PengaturanPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [waEnabled, setWaEnabled] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      setName(storeData.name || "");
      setDescription(storeData.description || "");
      setWaNumber(storeData.wa_number || "");
      setWaEnabled(storeData.wa_notif_enabled || false);
      setLoading(false);
    }
    init();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase.from("stores").update({
      name: name.trim(),
      description: description.trim(),
      wa_number: waNumber.trim() || null,
      wa_notif_enabled: waEnabled,
    }).eq("id", store.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <p className="text-[#8B8D85]">Memuat...</p>
    </main>
  );

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/pengaturan" headerTitle="Pengaturan">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1C1C1A]">Pengaturan toko</h1>
        <NotificationBell storeId={store.id} />
      </div>

      <form onSubmit={handleSave} className="space-y-5 max-w-2xl">

        {/* Informasi Toko */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E2D9] flex items-center gap-2">
            <Store size={17} className="text-[#D85A30]" />
            <h2 className="font-semibold text-[#1C1C1A] text-sm">Informasi toko</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#5B6472] block mb-1.5">Nama toko</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5B6472] block mb-1.5">Deskripsi toko <span className="text-[#8B8D85] font-normal">(opsional)</span></label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Ceritain sedikit tentang tokomu..."
                className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30] resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5B6472] block mb-1.5">Link toko</label>
              <div className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E2D9] rounded-lg bg-[#FAFAF7]">
                <Globe size={14} className="text-[#8B8D85]" />
                <span className="text-sm text-[#8B8D85]">tokku.id/</span>
                <span className="text-sm text-[#1C1C1A] font-medium">{store.slug}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifikasi WhatsApp */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E2D9] flex items-center gap-2">
            <Bell size={17} className="text-[#D85A30]" />
            <h2 className="font-semibold text-[#1C1C1A] text-sm">Notifikasi WhatsApp</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#5B6472] block mb-1.5">Nomor WhatsApp penjual</label>
              <input type="tel" value={waNumber} onChange={(e) => setWaNumber(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
              <p className="text-xs text-[#8B8D85] mt-1.5">Nomor ini dipakai untuk kirim notifikasi pesanan masuk ke kamu (seller).</p>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-[#1C1C1A]">Aktifkan notifikasi WA</p>
                <p className="text-xs text-[#8B8D85] mt-0.5">Dapat notif WA setiap ada pesanan masuk</p>
              </div>
              <button type="button" onClick={() => setWaEnabled((p) => !p)}
                className={`relative w-11 h-6 rounded-full transition-colors ${waEnabled ? "bg-[#D85A30]" : "bg-[#C5C3BB]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${waEnabled ? "translate-x-5" : ""}`} />
              </button>
            </div>

            {waEnabled && !waNumber && (
              <div className="bg-[#FAEEDA] text-[#854F0B] text-xs px-4 py-2.5 rounded-lg">
                Masukkan nomor WA dulu biar notifikasi bisa jalan ya!
              </div>
            )}

            <div className="bg-[#F1EFE8] rounded-lg px-4 py-3">
              <p className="text-xs text-[#5B6472] font-medium mb-1">Notifikasi WA dikirim saat:</p>
              <ul className="text-xs text-[#8B8D85] space-y-1 list-disc list-inside">
                <li>Ada pesanan baru masuk (online payment)</li>
                <li>Pembayaran pesanan dikonfirmasi</li>
                <li>Ada pesanan COD baru</li>
              </ul>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#D85A30] text-white rounded-xl font-medium hover:bg-[#B84A25] transition-colors disabled:opacity-50">
          <Save size={16} />
          {saving ? "Menyimpan..." : saved ? "Tersimpan ✓" : "Simpan perubahan"}
        </button>
      </form>
    </DashboardLayout>
  );
}
