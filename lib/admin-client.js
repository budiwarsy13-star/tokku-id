"use client";
// Klien browser untuk admin panel.
//  - Sesi di sessionStorage (hilang saat tab ditutup) dengan kunci TERPISAH dari sesi seller.
//  - Browser TIDAK pernah membaca database langsung: semua data lewat /api/admin/* yang memeriksa
//    admin + MFA + izin di server.
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

let _klien = null;
export function adminSupabase() {
  if (!_klien) {
    _klien = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        storageKey: "tokku-admin-auth",
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
        persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
      },
    });
  }
  return _klien;
}

export function keLogin(kode) {
  if (typeof window !== "undefined") window.location.href = "/admin/masuk" + (kode ? `?e=${encodeURIComponent(kode)}` : "");
}
export async function keluar(kode) {
  try { await adminSupabase().auth.signOut(); } catch { /* sudah keluar */ }
  keLogin(kode);
}

const KODE_LOGIN_ULANG = ["MFA_DIPERLUKAN", "MFA_KEDALUWARSA", "AKSES_DITOLAK", "BELUM_LOGIN", "SESI_TIDAK_VALID"];

export async function adminFetch(path, { method = "GET", body } = {}) {
  const { data: { session } } = await adminSupabase().auth.getSession();
  if (!session) { keLogin(); return { ok: false, status: 401, data: { message: "Belum login." } }; }
  let res, data;
  try {
    res = await fetch(path, {
      method, cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    data = await res.json();
  } catch {
    return { ok: false, status: 0, data: { message: "Koneksi bermasalah. Coba lagi." } };
  }
  if (KODE_LOGIN_ULANG.includes(data?.kode) && res.status !== 429) { await keluar(data.kode); }
  return { ok: res.ok && data.success !== false, status: res.status, data };
}

// Info admin yang sedang login (peran, status MFA). Satu kali per halaman.
export function useAdminMe() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    let batal = false;
    (async () => {
      const r = await adminFetch("/api/admin/me");
      if (batal) return;
      if (!r.ok || !r.data.mfaOk) { keLogin(r.ok ? "MFA_DIPERLUKAN" : undefined); return; }
      setMe(r.data);
    })();
    return () => { batal = true; };
  }, []);
  return me;
}

// Ambil data GET dari /api/admin/*. `muatUlang()` memicu ambil ulang (setelah aksi).
export function useData(url) {
  const [versi, setVersi] = useState(0);
  const kunci = `${url}#${versi}`;
  const [hasil, setHasil] = useState({ kunci: null, data: null, galat: "" });
  useEffect(() => {
    let batal = false;
    (async () => {
      const r = await adminFetch(url);
      if (batal) return;
      setHasil({ kunci, data: r.ok ? r.data : null, galat: r.ok ? "" : r.data?.message || "Gagal memuat data." });
    })();
    return () => { batal = true; };
  }, [url, versi, kunci]);
  return { memuat: hasil.kunci !== kunci, data: hasil.data, galat: hasil.galat, muatUlang: () => setVersi((v) => v + 1) };
}
