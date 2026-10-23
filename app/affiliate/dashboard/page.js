"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Copy, Check, Plus, Trash2, MousePointerClick, ShoppingBag, Percent, Wallet, BadgeCheck, Clock,
  ShieldCheck, Search, Trophy, Info,
} from "lucide-react";
import AffiliateShell from "@/components/AffiliateShell";
import { PLATFORMS, MAX_CHANNELS, platformByKey } from "@/lib/affiliate-config";

const input = "w-full border border-[#E5E2D9] rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#D85A30] bg-white";
const label = "text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5";
const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
const tgl = (d) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const STATUS = {
  pending:  { teks: "Menunggu",   cls: "bg-[#FFF4D6] text-[#B8860B]" },
  terkunci: { teks: "Terkunci",   cls: "bg-[#E6F1FB] text-[#0C447C]" },
  dibayar:  { teks: "Dibayar",    cls: "bg-[#EAF3DE] text-[#3B6D11]" },
  batal:    { teks: "Batal",      cls: "bg-[#FCEBEB] text-[#A32D2D]" },
};

async function panggil(url, opsi) {
  const res = await fetch(url, { ...opsi, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, data };
}

function Salin({ teks, tulisan = "Salin" }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(teks); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}
      className="flex items-center gap-1 text-xs text-[#D85A30] hover:bg-[#FAECE7] px-2 py-1 rounded-md flex-shrink-0">
      {ok ? <Check size={13} /> : <Copy size={13} />} {ok ? "Tersalin" : tulisan}
    </button>
  );
}

function Tile({ icon: Icon, nama, nilai, sub }) {
  return (
    <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4">
      <Icon size={18} className="text-[#8B8D85] mb-2" strokeWidth={1.75} />
      <p className="text-xs text-[#8B8D85]">{nama}</p>
      <p className="text-xl font-bold">{nilai}</p>
      {sub && <p className="text-xs text-[#8B8D85] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardAffiliate() {
  const [a, setA] = useState(null);
  const [tab, setTab] = useState("ringkasan");
  const [origin, setOrigin] = useState("");
  const [baru, setBaru] = useState(false);

  const [hari, setHari] = useState(30);
  const [stat, setStat] = useState(null);
  const [produk, setProduk] = useState(null);
  const [cari, setCari] = useState("");
  const [pilihChannel, setPilihChannel] = useState("");

  const [form, setForm] = useState({ platform: "tiktok", handle: "", url: "", followers: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    const { ok, data } = await panggil("/api/affiliate/me");
    if (!ok) { window.location.href = "/affiliate"; return; }
    if (data.affiliate.status !== "aktif") { window.location.href = "/affiliate/daftar"; return; }
    setA(data.affiliate);
    setPilihChannel((p) => p || data.affiliate.channels.find((c) => c.aktif)?.refCode || "");
  }, []);

  const muatStat = useCallback(async (h) => {
    const { ok, data } = await panggil(`/api/affiliate/statistik?hari=${h}`);
    if (ok) setStat(data);
  }, []);

  const muatProduk = useCallback(async (q) => {
    const { ok, data } = await panggil(`/api/affiliate/produk?q=${encodeURIComponent(q || "")}`);
    if (ok) setProduk(data.produk);
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    setBaru(new URLSearchParams(window.location.search).get("baru") === "1");
    muat();
  }, [muat]);
  useEffect(() => { if (a) muatStat(hari); }, [a, hari, muatStat]);
  useEffect(() => { if (a && tab === "produk" && produk === null) muatProduk(""); }, [a, tab, produk, muatProduk]);

  async function tambah() {
    setSaving(true); setError("");
    const { ok, data } = await panggil("/api/affiliate/channel", { method: "POST", body: JSON.stringify(form) });
    setSaving(false);
    if (!ok) { setError(data.message || "Gagal menambah channel."); return; }
    setForm({ platform: form.platform, handle: "", url: "", followers: "" });
    muat(); muatStat(hari);
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
  const terbaik = stat?.perChannel?.find((c) => c.komisi > 0);

  const TABS = [["ringkasan", "Ringkasan"], ["produk", "Produk"], ["komisi", "Komisi"], ["channel", "Channel"]];

  return (
    <AffiliateShell onKeluar={keluar} judul={`@${a.username}`} lebar="max-w-5xl">
      {baru && (
        <div className="bg-[#EAF3DE] border border-[#C6DFA8] text-[#3B6D11] rounded-2xl px-5 py-4 mb-6 text-sm">
          <p className="font-semibold">Pendaftaran berhasil. Selamat datang, {a.namaLengkap.split(" ")[0]}!</p>
          <p className="mt-0.5">Pilih produk di tab Produk, salin link channel kamu, dan mulai bagikan.</p>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">Halo, {a.namaLengkap.split(" ")[0]}</h1>

      <div className="flex gap-1 border-b border-[#E5E2D9] mb-6 overflow-x-auto">
        {TABS.map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === k ? "border-[#D85A30] text-[#D85A30] font-semibold" : "border-transparent text-[#5B6472]"}`}>{t}</button>
        ))}
      </div>

      {/* ───────── RINGKASAN ───────── */}
      {tab === "ringkasan" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Performa</h2>
            <div className="flex gap-1">
              {[7, 30, 90].map((h) => (
                <button key={h} onClick={() => setHari(h)} className={`text-xs px-3 py-1.5 rounded-lg ${hari === h ? "bg-[#1C1C1A] text-white" : "bg-[#F1EFE8] text-[#5B6472]"}`}>{h} hari</button>
              ))}
            </div>
          </div>

          {!stat ? <p className="text-sm text-[#8B8D85]">Memuat...</p> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Tile icon={MousePointerClick} nama="Kunjungan link" nilai={stat.total.views.toLocaleString("id-ID")} sub={`${stat.total.klikProduk.toLocaleString("id-ID")} klik produk`} />
                <Tile icon={ShoppingBag} nama="Order" nilai={stat.total.order.toLocaleString("id-ID")} sub={`Omzet ${rp(stat.total.omzet)}`} />
                <Tile icon={Percent} nama="Konversi" nilai={`${stat.total.konversi}%`} sub="order / kunjungan" />
                <Tile icon={Wallet} nama="Komisi periode ini" nilai={rp(stat.total.komisi)} />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4">
                  <p className="text-xs text-[#8B8D85]">Menunggu</p>
                  <p className="text-lg font-bold text-[#B8860B]">{rp(stat.saldo.pending)}</p>
                  <p className="text-xs text-[#8B8D85]">Pesanan belum selesai / masih masa tahan</p>
                </div>
                <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4">
                  <p className="text-xs text-[#8B8D85]">Siap dicairkan</p>
                  <p className="text-lg font-bold text-[#0C447C]">{rp(stat.saldo.siapCair)}</p>
                  <p className="text-xs text-[#8B8D85]">Masuk batch mingguan (min. Rp50.000)</p>
                </div>
                <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4">
                  <p className="text-xs text-[#8B8D85]">Sudah dibayar</p>
                  <p className="text-lg font-bold text-[#3B6D11]">{rp(stat.saldo.dibayar)}</p>
                  <p className="text-xs text-[#8B8D85]">Total yang sudah ditransfer</p>
                </div>
              </div>

              {terbaik && (
                <div className="flex gap-3 bg-[#FAECE7] rounded-2xl px-4 py-3 text-sm">
                  <Trophy size={18} className="text-[#D85A30] flex-shrink-0 mt-0.5" />
                  <p>
                    Channel terkuat {hari} hari ini: <strong>{platformByKey(terbaik.platform)?.label} {terbaik.handle}</strong> dengan komisi {rp(terbaik.komisi)}
                    {terbaik.views > 0 && <> dari {terbaik.views.toLocaleString("id-ID")} kunjungan (konversi {terbaik.konversi}%, {rp(terbaik.epc)} per kunjungan)</>}.
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-bold mb-3">Per channel</h3>
                <div className="bg-white border border-[#E5E2D9] rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="bg-[#FAFAF7] text-[#5B6472] text-xs uppercase tracking-wider">
                        <th className="text-left px-4 py-3 font-medium">Channel</th>
                        <th className="text-right px-3 py-3 font-medium">Kunjungan</th>
                        <th className="text-right px-3 py-3 font-medium">Klik produk</th>
                        <th className="text-right px-3 py-3 font-medium">Order</th>
                        <th className="text-right px-3 py-3 font-medium">Konversi</th>
                        <th className="text-right px-3 py-3 font-medium">Per kunjungan</th>
                        <th className="text-right px-4 py-3 font-medium">Komisi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stat.perChannel.map((c) => (
                        <tr key={c.refCode} className={`border-t border-[#F1EFE8] ${c.aktif ? "" : "opacity-50"}`}>
                          <td className="px-4 py-3"><span className="font-medium">{platformByKey(c.platform)?.label}</span> <span className="text-[#8B8D85]">{c.handle}</span></td>
                          <td className="px-3 py-3 text-right">{c.views.toLocaleString("id-ID")}</td>
                          <td className="px-3 py-3 text-right">{c.klikProduk.toLocaleString("id-ID")}</td>
                          <td className="px-3 py-3 text-right">{c.order}</td>
                          <td className="px-3 py-3 text-right">{c.konversi}%</td>
                          <td className="px-3 py-3 text-right">{rp(c.epc)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{rp(c.komisi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-3">Riwayat pencairan</h3>
                {stat.pencairan.length === 0 ? (
                  <p className="text-sm text-[#8B8D85]">Belum ada pencairan. Batch dibuat tiap minggu untuk komisi terkunci yang totalnya minimal Rp50.000.</p>
                ) : (
                  <div className="space-y-2">
                    {stat.pencairan.map((p) => (
                      <div key={p.id} className="bg-white border border-[#E5E2D9] rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold">{rp(p.total)} <span className="text-xs font-normal text-[#8B8D85]">· {p.jumlahKomisi} komisi</span></p>
                          <p className="text-xs text-[#8B8D85]">Batch {tgl(p.dibuat)}{p.dibayarPada ? ` · dibayar ${tgl(p.dibayarPada)}` : ""}{p.referensi ? ` · ref ${p.referensi}` : ""}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-md ${p.status === "dibayar" ? "bg-[#EAF3DE] text-[#3B6D11]" : p.status === "gagal" ? "bg-[#FCEBEB] text-[#A32D2D]" : "bg-[#FFF4D6] text-[#B8860B]"}`}>
                          {p.status === "dibayar" ? "Sudah ditransfer" : p.status === "gagal" ? "Gagal" : "Menunggu transfer"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ───────── PRODUK ───────── */}
      {tab === "produk" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <form onSubmit={(e) => { e.preventDefault(); muatProduk(cari); }} className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B8D85]" />
              <input className={`${input} pl-10`} placeholder="Cari produk..." value={cari} onChange={(e) => setCari(e.target.value)} />
            </form>
            <select className={input} value={pilihChannel} onChange={(e) => setPilihChannel(e.target.value)}>
              {aktif.map((c) => <option key={c.id} value={c.refCode}>Link untuk: {platformByKey(c.platform)?.label} {c.handle}</option>)}
            </select>
          </div>
          <p className="text-xs text-[#8B8D85] flex gap-1.5"><Info size={14} className="flex-shrink-0 mt-px" /> Komisi dihitung dari harga barang setelah diskon (tanpa ongkir). Link mengarah ke toko; pembeli yang order dalam 7 hari tetap tercatat atas channel kamu.</p>

          {produk === null ? <p className="text-sm text-[#8B8D85]">Memuat...</p> : produk.length === 0 ? (
            <p className="text-sm text-[#8B8D85] py-8 text-center">Belum ada produk dengan komisi affiliate. Cek lagi nanti ya.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {produk.map((p) => {
                const link = `${origin}/${p.toko.slug}?ref=${pilihChannel}`;
                return (
                  <div key={p.id} className="bg-white border border-[#E5E2D9] rounded-2xl p-4 flex gap-3">
                    {p.foto ? <img src={p.foto} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-[#F1EFE8]" /> : <div className="w-20 h-20 rounded-xl bg-[#F1EFE8] flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-snug line-clamp-2">{p.nama}</p>
                      <p className="text-xs text-[#8B8D85] flex items-center gap-1 mt-0.5">
                        {p.toko.nama} {p.toko.verified && <BadgeCheck size={12} className="text-[#2563EB]" />} · {p.toko.pesananSukses} pesanan sukses
                      </p>
                      <p className="text-sm mt-1">{rp(p.harga)} <span className="text-[#3B6D11] font-semibold">· komisi {p.persen}% ≈ {rp(p.komisiPerUnit)}</span></p>
                      <div className="mt-2"><Salin teks={link} tulisan="Salin link toko" /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────── KOMISI ───────── */}
      {tab === "komisi" && (
        <div className="space-y-4">
          <div className="bg-[#F1EFE8] rounded-2xl p-4 text-xs text-[#5B6472] space-y-1">
            <p className="font-semibold text-[#1C1C1A] text-sm">Alur status komisi</p>
            <p><strong>Menunggu</strong>: order masuk. <strong>Terkunci</strong>: pesanan selesai + masa tahan 3 hari lewat (COD: uang sudah diterima). <strong>Dibayar</strong>: sudah ditransfer di batch mingguan. <strong>Batal</strong>: pesanan gagal atau return disetujui.</p>
          </div>
          {!stat ? <p className="text-sm text-[#8B8D85]">Memuat...</p> : stat.transaksi.length === 0 ? (
            <p className="text-sm text-[#8B8D85] py-8 text-center">Belum ada komisi. Mulai bagikan link kamu!</p>
          ) : (
            <div className="bg-white border border-[#E5E2D9] rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-[#FAFAF7] text-[#5B6472] text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-left px-3 py-3 font-medium">Produk</th>
                    <th className="text-left px-3 py-3 font-medium">Channel</th>
                    <th className="text-right px-3 py-3 font-medium">Nilai</th>
                    <th className="text-right px-3 py-3 font-medium">%</th>
                    <th className="text-right px-3 py-3 font-medium">Komisi</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stat.transaksi.map((t) => (
                    <tr key={t.id} className="border-t border-[#F1EFE8] align-top">
                      <td className="px-4 py-3 whitespace-nowrap">{tgl(t.tanggal)}<p className="text-xs text-[#8B8D85]">#{t.kodeOrder}</p></td>
                      <td className="px-3 py-3"><p className="line-clamp-2">{t.produk}{t.jumlah > 1 ? ` ×${t.jumlah}` : ""}</p><p className="text-xs text-[#8B8D85]">{t.toko}</p></td>
                      <td className="px-3 py-3 text-xs text-[#5B6472]">{t.channel}</td>
                      <td className="px-3 py-3 text-right">{rp(t.dasar)}</td>
                      <td className="px-3 py-3 text-right">{t.persen}%</td>
                      <td className="px-3 py-3 text-right font-semibold">{rp(t.komisi)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-md ${STATUS[t.status]?.cls}`}>{STATUS[t.status]?.teks}</span>
                        {t.alasan && <p className="text-xs text-[#8B8D85] mt-1">{t.alasan}</p>}
                        {t.status === "terkunci" && !t.dalamBatch && <p className="text-xs text-[#8B8D85] mt-1">Masuk batch berikutnya</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────── CHANNEL ───────── */}
      {tab === "channel" && (
        <div>
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
          {nonaktif.length > 0 && <p className="text-xs text-[#8B8D85] mb-4">Channel nonaktif: {nonaktif.map((c) => `${platformByKey(c.platform).label} ${c.handle}`).join(", ")}</p>}

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

          <h2 className="font-bold mb-3">Rekening pencairan</h2>
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4 lg:p-5 text-sm flex items-start gap-3">
            <ShieldCheck size={18} className="text-[#3B6D11] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{a.pembayaran?.penyedia} · ••••{a.pembayaran?.nomorAkhir}</p>
              <p className="text-[#5B6472]">a.n. {a.pembayaran?.namaPemilik} · NIK ••••{a.pembayaran?.nikAkhir}</p>
              <p className="text-xs text-[#8B8D85] mt-1">Mau ubah data rekening? Hubungi admin.</p>
            </div>
          </div>
        </div>
      )}
    </AffiliateShell>
  );
}
