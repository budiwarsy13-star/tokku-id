"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { HARGA, AKTIFKAN_TAHUNAN, PERBANDINGAN, PERIODE, isPro, sisaHariPro, rupiah } from "@/lib/plans";
import { Loader2, Crown, Check, AlertTriangle } from "lucide-react";

const tgl = (iso) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const STATUS = { paid: ["Lunas", "text-[#3B6D11] bg-[#EAF3DE]"], pending: ["Menunggu", "text-[#854F0B] bg-[#FAEEDA]"], failed: ["Gagal", "text-[#A32D2D] bg-[#FCEBEB]"], expired: ["Kedaluwarsa", "text-[#5B6472] bg-[#F1EFE8]"] };

export default function LanggananPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("bulanan");
  const [memproses, setMemproses] = useState(false);
  const [pesan, setPesan] = useState(null); // { tipe, teks }
  const [riwayat, setRiwayat] = useState([]);
  const poll = useRef(null);

  async function muat() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/masuk"; return null; }
    const { data: s } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
    if (!s) { window.location.href = "/dashboard"; return null; }
    setStore(s);
    const { data: r } = await supabase.from("plan_payments").select("order_id, period_months, amount, status, created_at")
      .eq("store_id", s.id).order("created_at", { ascending: false }).limit(5);
    setRiwayat(r || []);
    return s;
  }

  // Webhook butuh beberapa detik: cek berkala sampai paket aktif.
  function tungguAktif(expiresLama) {
    setPesan({ tipe: "info", teks: "Pembayaran diterima. Mengaktifkan paket Pro..." });
    let n = 0;
    clearInterval(poll.current);
    poll.current = setInterval(async () => {
      n += 1;
      const s = await muat();
      const aktifBaru = s && isPro(s) && s.plan_expires_at !== expiresLama;
      if (aktifBaru) {
        clearInterval(poll.current);
        setPesan({ tipe: "ok", teks: "Paket Pro aktif. Terima kasih! 🎉" });
      } else if (n >= 15) {
        clearInterval(poll.current);
        setPesan({ tipe: "info", teks: "Pembayaran sedang diproses. Kalau paket belum aktif dalam beberapa menit, muat ulang halaman atau hubungi kami." });
      }
    }, 3000);
  }

  useEffect(() => {
    (async () => {
      const s = await muat();
      setLoading(false);
      if (s && new URLSearchParams(window.location.search).get("bayar") === "selesai") tungguAktif(s.plan_expires_at);
    })();
    return () => clearInterval(poll.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bayar() {
    setPesan(null); setMemproses(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/langganan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ periode }),
      });
      const data = await res.json();
      if (!data.success) { setPesan({ tipe: "err", teks: data.message || "Gagal membuat tagihan." }); setMemproses(false); return; }

      if (data.provider === "xendit") { window.location.href = data.redirectUrl; return; }

      // Midtrans Snap (popup)
      const expiresLama = store.plan_expires_at;
      if (!window.snap) {
        await new Promise((resolve, reject) => {
          const sc = document.createElement("script");
          sc.src = process.env.NEXT_PUBLIC_MIDTRANS_PRODUCTION === "true"
            ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";
          sc.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);
          sc.onload = resolve; sc.onerror = () => reject(new Error("Gagal memuat Midtrans"));
          document.body.appendChild(sc);
        });
      }
      setMemproses(false);
      window.snap.pay(data.token, {
        onSuccess: () => tungguAktif(expiresLama),
        onPending: () => setPesan({ tipe: "info", teks: "Menunggu pembayaran. Paket aktif otomatis begitu pembayaran masuk." }),
        onError: () => setPesan({ tipe: "err", teks: "Pembayaran gagal. Silakan coba lagi." }),
        onClose: () => {},
      });
    } catch (e) {
      setPesan({ tipe: "err", teks: e.message || "Terjadi kesalahan." });
      setMemproses(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;

  const pro = isPro(store);
  const pernahPro = store.plan === "pro" && store.plan_expires_at && !pro;
  const hemat = HARGA.bulanan * 12 - HARGA.tahunan;
  const harga = HARGA[periode];

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/langganan" headerTitle="Langganan">
      <div className="max-w-3xl space-y-6">
        {pesan && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${pesan.tipe === "ok" ? "bg-[#EAF3DE] text-[#3B6D11]" : pesan.tipe === "err" ? "bg-[#FCEBEB] text-[#A32D2D]" : "bg-[#E6F1FB] text-[#185FA5]"}`}>
            {pesan.tipe === "ok" ? <Check size={16} /> : pesan.tipe === "err" ? <AlertTriangle size={16} /> : <Loader2 size={16} className="animate-spin" />} {pesan.teks}
          </div>
        )}

        {/* STATUS */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${pro ? "bg-[#1C1C1A] text-white" : "bg-[#F1EFE8] text-[#8B8D85]"}`}><Crown size={20} /></div>
          <div>
            {pro ? (<>
              <p className="font-bold text-[#1C1C1A]">Paket Pro aktif</p>
              <p className="text-sm text-[#5B6472]">Berlaku sampai {tgl(store.plan_expires_at)} ({sisaHariPro(store)} hari lagi)</p>
            </>) : (<>
              <p className="font-bold text-[#1C1C1A]">Paket Gratis</p>
              <p className="text-sm text-[#5B6472]">{pernahPro ? `Paket Pro berakhir ${tgl(store.plan_expires_at)}. Data kamu tetap aman, tidak ada yang dihapus.` : "Upgrade untuk membuka semua fitur pertumbuhan."}</p>
            </>)}
          </div>
        </div>

        {/* PILIH PERIODE + BAYAR */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
          <h2 className="font-bold text-[#1C1C1A] mb-3">{pro ? "Perpanjang paket Pro" : "Upgrade ke Pro"}</h2>
          {AKTIFKAN_TAHUNAN && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {["bulanan", "tahunan"].map((k) => (
                <button key={k} type="button" onClick={() => setPeriode(k)}
                  className={`text-left rounded-xl border p-3 transition-colors ${periode === k ? "border-[#D85A30] bg-[#FAECE7]" : "border-[#E5E2D9] hover:bg-[#FAFAF7]"}`}>
                  <p className="text-sm font-semibold text-[#1C1C1A] capitalize">{k}</p>
                  <p className="text-xl font-black text-[#D85A30]">{rupiah(HARGA[k])}<span className="text-xs font-normal text-[#8B8D85]">/{k === "bulanan" ? "bulan" : "tahun"}</span></p>
                  {k === "tahunan" && <p className="text-[11px] font-semibold text-[#3B6D11]">Hemat {rupiah(hemat)} (gratis 2 bulan)</p>}
                </button>
              ))}
            </div>
          )}
          <button onClick={bayar} disabled={memproses}
            className="w-full py-3 rounded-xl bg-[#D85A30] text-white font-medium hover:bg-[#B84A25] disabled:opacity-50 flex items-center justify-center gap-2">
            {memproses && <Loader2 size={16} className="animate-spin" />}
            {pro ? "Perpanjang" : "Upgrade"} {PERIODE[periode].label} · {rupiah(harga)}
          </button>
          <p className="text-xs text-[#8B8D85] mt-2">Perpanjangan ditambahkan ke sisa masa aktif, tidak hangus. Tidak ada perpanjangan otomatis.</p>
        </div>

        {/* PERBANDINGAN */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#1C1C1A] text-white text-left">
              <th className="px-4 py-2.5 font-semibold">Fitur</th><th className="px-4 py-2.5 font-semibold text-center">Gratis</th><th className="px-4 py-2.5 font-semibold text-center">Pro</th>
            </tr></thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {PERBANDINGAN.map((r) => (
                <tr key={r.fitur}><td className="px-4 py-2.5 text-[#1C1C1A]">{r.fitur}</td>
                  <td className="px-4 py-2.5 text-center text-[#5B6472]">{r.gratis}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-[#D85A30]">{r.pro}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIWAYAT */}
        {riwayat.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
            <h2 className="font-bold text-[#1C1C1A] mb-2">Riwayat pembayaran</h2>
            <div className="divide-y divide-[#F1EFE8]">
              {riwayat.map((r) => { const [lbl, cls] = STATUS[r.status] || [r.status, "bg-[#F1EFE8]"]; return (
                <div key={r.order_id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-[#1C1C1A]">Pro {r.period_months} bulan · {rupiah(r.amount)}</span>
                  <span className="flex items-center gap-2"><span className="text-xs text-[#8B8D85]">{tgl(r.created_at)}</span><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{lbl}</span></span>
                </div>); })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
