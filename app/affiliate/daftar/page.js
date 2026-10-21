"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import AffiliateShell from "@/components/AffiliateShell";
import {
  PLATFORMS, NICHES, PAYOUT_PROVIDERS, PROVINSI, MAX_CHANNELS, UMUR_MINIMAL, TERMS_VERSION, platformByKey,
} from "@/lib/affiliate-config";

const LANGKAH = ["Profil", "Identitas & pencairan", "Channel sosmed", "Tinjau"];
const input = "w-full border border-[#E5E2D9] rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#D85A30] bg-white";
const label = "text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5";

async function panggil(url, opsi) {
  const res = await fetch(url, { ...opsi, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, status: res.status, data };
}

export default function DaftarAffiliate() {
  const [siap, setSiap] = useState(false);
  const [phone, setPhone] = useState("");
  const [langkah, setLangkah] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [profil, setProfil] = useState({ namaLengkap: "", username: "", email: "", tanggalLahir: "", provinsi: "", kota: "", niche: [], bio: "" });
  const [bayar, setBayar] = useState({ nik: "", npwp: "", jenis: "bank", penyedia: "", nomor: "", namaPemilik: "" });
  const [channels, setChannels] = useState([]);
  const [chBaru, setChBaru] = useState({ platform: "tiktok", handle: "", url: "", followers: "" });
  const [setuju, setSetuju] = useState(false);
  const [userCek, setUserCek] = useState(null); // null | "cek" | "ok" | "dipakai" | "invalid"
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      const { ok, data } = await panggil("/api/affiliate/me");
      if (!ok) { window.location.href = "/affiliate"; return; }
      if (data.affiliate.status === "aktif") { window.location.href = "/affiliate/dashboard"; return; }
      setPhone(data.affiliate.phone);
      setSiap(true);
    })();
  }, []);

  // Cek ketersediaan username (debounce 500ms).
  useEffect(() => {
    clearTimeout(timer.current);
    const u = profil.username;
    if (!u) { setUserCek(null); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setUserCek("invalid"); return; }
    setUserCek("cek");
    timer.current = setTimeout(async () => {
      const { ok, data } = await panggil(`/api/affiliate/username?u=${encodeURIComponent(u)}`);
      setUserCek(ok ? (data.tersedia ? "ok" : "dipakai") : null);
    }, 500);
    return () => clearTimeout(timer.current);
  }, [profil.username]);

  const ubahProfil = (k, v) => setProfil((p) => ({ ...p, [k]: v }));
  const ubahBayar = (k, v) => setBayar((p) => ({ ...p, [k]: v }));

  function toggleNiche(n) {
    setProfil((p) => {
      if (p.niche.includes(n)) return { ...p, niche: p.niche.filter((x) => x !== n) };
      if (p.niche.length >= 5) return p;
      return { ...p, niche: [...p.niche, n] };
    });
  }

  function cekLangkah(i) {
    if (i === 0) {
      if (profil.namaLengkap.trim().length < 3) return "Isi nama lengkap sesuai KTP.";
      if (!/^[a-z0-9_]{3,20}$/.test(profil.username)) return "Username 3-20 karakter: huruf kecil, angka, atau underscore.";
      if (userCek === "dipakai") return "Username itu sudah dipakai.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(profil.email)) return "Format email belum benar.";
      if (!profil.tanggalLahir) return "Isi tanggal lahir.";
      const batas = new Date(); batas.setFullYear(batas.getFullYear() - UMUR_MINIMAL);
      if (new Date(profil.tanggalLahir) > batas) return `Umur minimal ${UMUR_MINIMAL} tahun.`;
      if (!profil.provinsi) return "Pilih provinsi.";
      if (profil.kota.trim().length < 2) return "Isi kota/kabupaten.";
      if (profil.niche.length < 1) return "Pilih minimal 1 kategori konten.";
    }
    if (i === 1) {
      if (bayar.nik.replace(/\D/g, "").length !== 16) return "NIK harus 16 digit.";
      const np = bayar.npwp.replace(/\D/g, "");
      if (np && ![15, 16].includes(np.length)) return "NPWP harus 15 atau 16 digit (atau kosongkan).";
      if (!bayar.penyedia) return "Pilih bank / e-wallet.";
      if (bayar.nomor.replace(/\D/g, "").length < 6) return "Isi nomor rekening / e-wallet.";
      if (bayar.namaPemilik.trim().length < 3) return "Isi nama pemilik rekening.";
    }
    if (i === 2 && channels.length < 1) return "Tambahkan minimal 1 channel sosmed.";
    return "";
  }

  function lanjut() {
    const e = cekLangkah(langkah);
    if (e) { setError(e); return; }
    setError(""); setLangkah(langkah + 1); window.scrollTo({ top: 0 });
  }

  function tambahChannel() {
    const p = platformByKey(chBaru.platform);
    const handle = chBaru.handle.trim().replace(/^@/, "");
    if (handle.length < 2) { setError("Isi nama/username channel."); return; }
    if (p.perluUrl && !chBaru.url.trim()) { setError("Link website wajib diisi."); return; }
    if (channels.some((c) => c.platform === chBaru.platform && c.handle.toLowerCase() === handle.toLowerCase())) { setError("Channel itu sudah ditambahkan."); return; }
    if (channels.length >= MAX_CHANNELS) { setError(`Maksimal ${MAX_CHANNELS} channel.`); return; }
    setChannels([...channels, { ...chBaru, handle }]);
    setChBaru({ platform: chBaru.platform, handle: "", url: "", followers: "" });
    setError("");
  }

  async function kirim() {
    if (!setuju) { setError("Centang persetujuan Syarat & Ketentuan dulu."); return; }
    setSaving(true); setError("");
    const { ok, data } = await panggil("/api/affiliate/daftar", {
      method: "POST", body: JSON.stringify({ profil, pembayaran: bayar, channels, setuju }),
    });
    setSaving(false);
    if (!ok) { setError(data.message || "Gagal mendaftar."); return; }
    window.location.href = "/affiliate/dashboard?baru=1";
  }

  async function keluar() {
    await panggil("/api/affiliate/keluar", { method: "POST" });
    window.location.href = "/affiliate";
  }

  if (!siap) return <AffiliateShell><p className="text-sm text-[#8B8D85]">Memuat...</p></AffiliateShell>;

  return (
    <AffiliateShell onKeluar={keluar} judul={phone}>
      {/* progres */}
      <ol className="flex items-center gap-2 mb-6 overflow-x-auto">
        {LANGKAH.map((n, i) => (
          <li key={n} className="flex items-center gap-2 flex-shrink-0">
            <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${i < langkah ? "bg-[#3B6D11] text-white" : i === langkah ? "bg-[#D85A30] text-white" : "bg-[#F1EFE8] text-[#8B8D85]"}`}>
              {i < langkah ? <Check size={14} /> : i + 1}
            </span>
            <span className={`text-sm ${i === langkah ? "font-semibold" : "text-[#8B8D85]"}`}>{n}</span>
            {i < LANGKAH.length - 1 && <span className="w-6 h-px bg-[#E5E2D9]" />}
          </li>
        ))}
      </ol>

      <div className="bg-white border border-[#E5E2D9] rounded-2xl p-5 lg:p-8">
        {langkah === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Profil kamu</h2>
            <div>
              <label className={label}>Nama lengkap (sesuai KTP)</label>
              <input className={input} value={profil.namaLengkap} onChange={(e) => ubahProfil("namaLengkap", e.target.value)} />
            </div>
            <div>
              <label className={label}>Username affiliate</label>
              <input className={input} value={profil.username} placeholder="contoh: budi_review"
                onChange={(e) => ubahProfil("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} />
              <p className={`text-xs mt-1 ${userCek === "ok" ? "text-[#3B6D11]" : userCek === "dipakai" || userCek === "invalid" ? "text-[#A32D2D]" : "text-[#8B8D85]"}`}>
                {userCek === "cek" ? "Memeriksa..." : userCek === "ok" ? "Tersedia" : userCek === "dipakai" ? "Sudah dipakai" : userCek === "invalid" ? "3-20 karakter: huruf kecil, angka, underscore" : "Dipakai di link kamu. Gak bisa diganti setelah daftar."}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Email</label>
                <input type="email" className={input} value={profil.email} onChange={(e) => ubahProfil("email", e.target.value)} />
              </div>
              <div>
                <label className={label}>Tanggal lahir</label>
                <input type="date" className={input} value={profil.tanggalLahir} onChange={(e) => ubahProfil("tanggalLahir", e.target.value)} />
              </div>
              <div>
                <label className={label}>Provinsi</label>
                <select className={input} value={profil.provinsi} onChange={(e) => ubahProfil("provinsi", e.target.value)}>
                  <option value="">Pilih provinsi</option>
                  {PROVINSI.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Kota / kabupaten</label>
                <input className={input} value={profil.kota} onChange={(e) => ubahProfil("kota", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>Kategori konten (maks. 5)</label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((n) => (
                  <button type="button" key={n} onClick={() => toggleNiche(n)}
                    className={`text-sm px-3 py-1.5 rounded-full border ${profil.niche.includes(n) ? "bg-[#FAECE7] border-[#D85A30] text-[#D85A30] font-semibold" : "border-[#E5E2D9] text-[#5B6472]"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>Bio singkat (opsional)</label>
              <textarea className={input} rows={2} maxLength={200} value={profil.bio} onChange={(e) => ubahProfil("bio", e.target.value)}
                placeholder="Ceritakan konten yang kamu buat" />
            </div>
          </div>
        )}

        {langkah === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Identitas &amp; rekening pencairan</h2>
            <div className="flex gap-2 bg-[#F1EFE8] text-[#5B6472] text-xs rounded-xl px-3 py-2.5">
              <ShieldCheck size={16} className="flex-shrink-0 text-[#3B6D11] mt-0.5" />
              <p>NIK, NPWP, dan nomor rekening disimpan terenkripsi dan tidak pernah ditampilkan utuh. Dipakai hanya untuk pencairan komisi dan kewajiban pajak.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>NIK (16 digit)</label>
                <input className={input} inputMode="numeric" maxLength={20} value={bayar.nik} onChange={(e) => ubahBayar("nik", e.target.value)} />
              </div>
              <div>
                <label className={label}>NPWP (opsional)</label>
                <input className={input} inputMode="numeric" maxLength={25} value={bayar.npwp} onChange={(e) => ubahBayar("npwp", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>Jenis rekening</label>
              <div className="grid grid-cols-2 gap-2">
                {[["bank", "Rekening bank"], ["ewallet", "E-wallet"]].map(([k, t]) => (
                  <button type="button" key={k} onClick={() => setBayar((b) => ({ ...b, jenis: k, penyedia: "" }))}
                    className={`py-2.5 rounded-xl border text-sm ${bayar.jenis === k ? "bg-[#FAECE7] border-[#D85A30] text-[#D85A30] font-semibold" : "border-[#E5E2D9] text-[#5B6472]"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>{bayar.jenis === "bank" ? "Bank" : "E-wallet"}</label>
                <select className={input} value={bayar.penyedia} onChange={(e) => ubahBayar("penyedia", e.target.value)}>
                  <option value="">Pilih</option>
                  {PAYOUT_PROVIDERS[bayar.jenis].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>{bayar.jenis === "bank" ? "Nomor rekening" : "Nomor e-wallet"}</label>
                <input className={input} inputMode="numeric" value={bayar.nomor} onChange={(e) => ubahBayar("nomor", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>Nama pemilik rekening</label>
              <input className={input} value={bayar.namaPemilik} onChange={(e) => ubahBayar("namaPemilik", e.target.value)} />
              <p className="text-xs text-[#8B8D85] mt-1">Harus sama dengan nama di buku tabungan / akun e-wallet, dan sesuai nama KTP kamu.</p>
            </div>
          </div>
        )}

        {langkah === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Channel sosmed</h2>
            <p className="text-sm text-[#5B6472]">
              Tiap channel dapat link sendiri, jadi komisi bisa dilacak per channel. Kamu bisa daftarkan hingga {MAX_CHANNELS} channel.
            </p>

            {channels.length > 0 && (
              <ul className="space-y-2">
                {channels.map((c, i) => (
                  <li key={i} className="flex items-center justify-between border border-[#E5E2D9] rounded-xl px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{platformByKey(c.platform).label} · {c.handle}</p>
                      <p className="text-xs text-[#8B8D85]">{Number(c.followers || 0).toLocaleString("id-ID")} pengikut</p>
                    </div>
                    <button type="button" onClick={() => setChannels(channels.filter((_, x) => x !== i))} className="p-2 text-[#A32D2D] hover:bg-[#FCEBEB] rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border border-dashed border-[#E5E2D9] rounded-xl p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={label}>Platform</label>
                  <select className={input} value={chBaru.platform} onChange={(e) => setChBaru({ ...chBaru, platform: e.target.value })}>
                    {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Nama / username</label>
                  <input className={input} value={chBaru.handle} placeholder={platformByKey(chBaru.platform).placeholder}
                    onChange={(e) => setChBaru({ ...chBaru, handle: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Link channel {platformByKey(chBaru.platform).perluUrl ? "" : "(opsional)"}</label>
                  <input className={input} value={chBaru.url} placeholder="https://..." onChange={(e) => setChBaru({ ...chBaru, url: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Jumlah pengikut</label>
                  <input className={input} inputMode="numeric" value={chBaru.followers}
                    onChange={(e) => setChBaru({ ...chBaru, followers: e.target.value.replace(/\D/g, "") })} />
                </div>
              </div>
              <button type="button" onClick={tambahChannel} className="flex items-center gap-1.5 text-sm font-semibold text-[#D85A30] hover:bg-[#FAECE7] px-3 py-2 rounded-lg">
                <Plus size={16} /> Tambah channel
              </button>
            </div>
            <p className="text-xs text-[#8B8D85]">
              Setelah daftar, kamu dapat kode verifikasi untuk ditaruh di bio tiap channel sebagai bukti kepemilikan.
            </p>
          </div>
        )}

        {langkah === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Tinjau &amp; kirim</h2>
            <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-[#8B8D85]">Nama</dt><dd>{profil.namaLengkap}</dd>
              <dt className="text-[#8B8D85]">Username</dt><dd>@{profil.username}</dd>
              <dt className="text-[#8B8D85]">WhatsApp</dt><dd>{phone}</dd>
              <dt className="text-[#8B8D85]">Email</dt><dd>{profil.email}</dd>
              <dt className="text-[#8B8D85]">Domisili</dt><dd>{profil.kota}, {profil.provinsi}</dd>
              <dt className="text-[#8B8D85]">Kategori</dt><dd>{profil.niche.join(", ")}</dd>
              <dt className="text-[#8B8D85]">Pencairan</dt><dd>{bayar.penyedia} · ••••{bayar.nomor.replace(/\D/g, "").slice(-4)} · {bayar.namaPemilik.toUpperCase()}</dd>
              <dt className="text-[#8B8D85]">Channel</dt><dd>{channels.map((c) => `${platformByKey(c.platform).label} ${c.handle}`).join(", ")}</dd>
            </dl>

            <div className="bg-[#F1EFE8] rounded-xl p-4 text-xs text-[#5B6472] space-y-1.5">
              <p className="font-semibold text-[#1C1C1A] text-sm">Ringkasan Syarat &amp; Ketentuan Affiliate</p>
              <p>• Komisi dihitung dari persentase yang ditetapkan seller per produk, dan baru dibayar setelah pesanan selesai (COD: setelah uang diterima).</p>
              <p>• Komisi dicairkan per batch mingguan ke rekening yang kamu daftarkan.</p>
              <p>• Dilarang order untuk diri sendiri lewat link sendiri, spam, atau klaim produk yang menyesatkan. Pelanggaran bisa membatalkan komisi dan menangguhkan akun.</p>
              <p>• Data identitas dipakai untuk verifikasi, pencairan, dan kewajiban pajak. (versi {TERMS_VERSION})</p>
            </div>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 accent-[#D85A30]" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} />
              <span>Saya menyatakan data di atas benar dan menyetujui Syarat &amp; Ketentuan Tokku Affiliate.</span>
            </label>
          </div>
        )}

        {error && <p className="text-sm text-[#A32D2D] mt-4">{error}</p>}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[#F1EFE8]">
          <button type="button" disabled={langkah === 0 || saving} onClick={() => { setError(""); setLangkah(langkah - 1); }}
            className="flex items-center gap-1.5 text-sm text-[#5B6472] hover:bg-[#F1EFE8] px-3 py-2.5 rounded-xl disabled:opacity-0">
            <ArrowLeft size={16} /> Kembali
          </button>
          {langkah < 3 ? (
            <button type="button" onClick={lanjut} className="flex items-center gap-1.5 bg-[#D85A30] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#C14E27]">
              Lanjut <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={kirim} disabled={saving} className="bg-[#D85A30] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#C14E27] disabled:opacity-60">
              {saving ? "Mengirim..." : "Daftar sekarang"}
            </button>
          )}
        </div>
      </div>
    </AffiliateShell>
  );
}
