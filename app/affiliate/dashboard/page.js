"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Plus, Trash2, MousePointerClick, ShoppingBag, Percent, Wallet, BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import AffiliateShell from "@/components/AffiliateShell";
import { PLATFORMS, MAX_CHANNELS, platformByKey } from "@/lib/affiliate-config";

const input = "w-full border border-[#E5E2D9] rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#D85A30] bg-white";
const label = "text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5";

async function panggil(url, opsi) {
  const res = await fetch(url, { ...opsi, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, data };
}

function Salin({ teks }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(teks); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}
      className="flex items-center gap-1 text-xs text-[#D85A30] hover:bg-[#FAECE7] px-2 py-1 rounded-md flex-shrink-0">
      {ok ? <Check size={13} /> : <Copy size={13} />} {ok ? "Tersalin" : "Salin"}
    </button>
  );
}

const STAT = [
  { icon: MousePointerClick, nama: "Klik" },
  { icon: ShoppingBag, nama: "Order" },
  { icon: Percent, nama: "Konversi" },
  { icon: Wallet, nama: "Komisi" },
];

export default function DashboardAffiliate() {
  const [a, setA] = useState(null);
  const [error, setError] = useState("");
  const [baru, setBaru] = useState(false);
  const [form, setForm] = useState({ platform: "tiktok", handle: "", url: "", followers: "" });
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  async function muat() {
    const { ok, data } = await panggil("/api/affiliate/me");
    if (!ok) { window.location.href = "/affiliate"; return; }
    if (data.affiliate.status !== "aktif") { window.location.href = "/affiliate/daftar"; return; }
    setA(data.affiliate);
  }
  useEffect(() => {
    setOrigin(window.location.origin);
    setBaru(new URLSearchParams(window.location.search).get("baru") === "1");
    muat();
  }, []);

  async function tambah() {
    setSaving(true); setError("");
    const { ok, data } = await panggil("/api/affiliate/channel", { method: "POST", body: JSON.stringify(form) });
    setSaving(false);
    if (!ok) { setError(data.message || "Gagal menambah channel."); return; }
    setForm({ platform: form.platform, handle: "", url: "", followers: "" });
    muat();
  }

  async function nonaktifkan(c) {
    if (!confirm(`Nonaktifkan channel ${c.handle}? Riwayat komisinya tetap tersimpan.`)) return;
    const { ok, data } = await panggil("/api/affiliate/channel", { method: "DELETE", body: JSON.stringify({ id: c.id }) });
    if (!ok) { alert(data.message || "Gagal."); return; }
    muat();
  }

  async function keluar() {
    await panggil("/api/affiliate/keluar", { method: "POST" });
    window.location.href = "/affiliate";
  }

  if (!a) return <AffiliateShell><p className="text-sm text-[#8B8D85]">Memuat...</p></AffiliateShell>;

  const aktif = a.channels.filter((c) => c.aktif);
  const nonaktif = a.channels.filter((c) => !c.aktif);
  const perluUrl = platformByKey(form.platform).perluUrl;

  return (
    <AffiliateShell onKeluar={keluar} judul={`@${a.username}`} lebar="max-w-4xl">
      {baru && (
        <div className="bg-[#EAF3DE] border border-[#C6DFA8] text-[#3B6D11] rounded-2xl px-5 py-4 mb-6 text-sm">
          <p className="font-semibold">Pendaftaran berhasil. Selamat datang, {a.namaLengkap.split(" ")[0]}!</p>
          <p className="mt-0.5">Taruh kode verifikasi di bio tiap channel, lalu mulai bagikan link kamu.</p>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-1">Halo, {a.namaLengkap.split(" ")[0]}</h1>
      <p className="text-sm text-[#5B6472] mb-6">Dashboard affiliate kamu.</p>

      {/* statistik: tahap berikutnya */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
        {STAT.map((s) => (
          <div key={s.nama} className="bg-white border border-[#E5E2D9] rounded-2xl p-4">
            <s.icon size={18} className="text-[#8B8D85] mb-2" strokeWidth={1.75} />
            <p className="text-xs text-[#8B8D85]">{s.nama}</p>
            <p className="text-xl font-bold text-[#C9C5B8]">—</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#8B8D85] mb-8">Statistik klik, order, dan komisi per channel akan muncul di sini begitu link kamu mulai dipakai.</p>

      {/* channel */}
      <h2 className="font-bold mb-3">Channel &amp; link kamu</h2>
      <div className="space-y-3 mb-4">
        {aktif.map((c) => {
          const p = platformByKey(c.platform);
          const link = `${origin}/NAMA-TOKO?ref=${c.refCode}`;
          return (
            <div key={c.id} className="bg-white border border-[#E5E2D9] rounded-2xl p-4 lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.label} · {c.handle}</p>
                  <p className="text-xs text-[#8B8D85]">{c.followers.toLocaleString("id-ID")} pengikut</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.terverifikasi
                    ? <span className="flex items-center gap-1 text-xs text-[#3B6D11] bg-[#EAF3DE] px-2 py-1 rounded-md"><BadgeCheck size={13} /> Terverifikasi</span>
                    : <span className="flex items-center gap-1 text-xs text-[#B8860B] bg-[#FFF4D6] px-2 py-1 rounded-md"><Clock size={13} /> Belum diverifikasi</span>}
                  <button onClick={() => nonaktifkan(c)} className="p-1.5 text-[#A32D2D] hover:bg-[#FCEBEB] rounded-lg" title="Nonaktifkan"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#FAFAF7] rounded-xl p-3">
                  <p className="text-[#8B8D85] mb-1">Kode channel</p>
                  <div className="flex items-center justify-between gap-2"><code className="font-semibold text-sm">{c.refCode}</code><Salin teks={c.refCode} /></div>
                  <p className="text-[#8B8D85] mt-2 break-all">Format link: {link}</p>
                </div>
                {!c.terverifikasi && (
                  <div className="bg-[#FFF9E8] rounded-xl p-3">
                    <p className="text-[#8B8D85] mb-1">Kode verifikasi kepemilikan</p>
                    <div className="flex items-center justify-between gap-2"><code className="font-semibold text-sm">{c.kodeVerifikasi}</code><Salin teks={c.kodeVerifikasi} /></div>
                    <p className="text-[#8B8D85] mt-2">Taruh di bio channel ini. Tim kami memeriksa dan menandainya terverifikasi.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {nonaktif.length > 0 && (
        <p className="text-xs text-[#8B8D85] mb-4">Channel nonaktif: {nonaktif.map((c) => `${platformByKey(c.platform).label} ${c.handle}`).join(", ")}</p>
      )}

      {aktif.length < MAX_CHANNELS && (
        <div className="bg-white border border-dashed border-[#E5E2D9] rounded-2xl p-4 lg:p-5 mb-8">
          <p className="font-semibold text-sm mb-3">Tambah channel</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Platform</label>
              <select className={input} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Nama / username</label>
              <input className={input} value={form.handle} placeholder={platformByKey(form.platform).placeholder} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
            </div>
            <div>
              <label className={label}>Link {perluUrl ? "" : "(opsional)"}</label>
              <input className={input} value={form.url} placeholder="https://..." onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div>
              <label className={label}>Jumlah pengikut</label>
              <input className={input} inputMode="numeric" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value.replace(/\D/g, "") })} />
            </div>
          </div>
          {error && <p className="text-sm text-[#A32D2D] mt-3">{error}</p>}
          <button onClick={tambah} disabled={saving || form.handle.trim().length < 2}
            className="mt-3 flex items-center gap-1.5 bg-[#D85A30] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#C14E27] disabled:opacity-60">
            <Plus size={16} /> {saving ? "Menyimpan..." : "Tambah channel"}
          </button>
        </div>
      )}

      {/* pembayaran */}
      <h2 className="font-bold mb-3">Rekening pencairan</h2>
      <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4 lg:p-5 text-sm flex items-start gap-3">
        <ShieldCheck size={18} className="text-[#3B6D11] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">{a.pembayaran?.penyedia} · ••••{a.pembayaran?.nomorAkhir}</p>
          <p className="text-[#5B6472]">a.n. {a.pembayaran?.namaPemilik} · NIK ••••{a.pembayaran?.nikAkhir}</p>
          <p className="text-xs text-[#8B8D85] mt-1">Pencairan komisi dilakukan per batch mingguan. Mau ubah data rekening? Hubungi admin.</p>
        </div>
      </div>
    </AffiliateShell>
  );
}
