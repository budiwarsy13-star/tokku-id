"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, BellOff } from "lucide-react";

// Buffer gak available di browser, jadi decode base64url manual pakai atob()
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushOptIn() {
  const [status, setStatus] = useState("checking"); // checking | unsupported | denied | off | on | loading
  const [error, setError] = useState("");

  useEffect(() => {
    async function cekStatus() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const existingSub = reg ? await reg.pushManager.getSubscription() : null;
        setStatus(existingSub ? "on" : "off");
      } catch {
        setStatus("off");
      }
    }
    cekStatus();
  }, []);

  async function aktifkan() {
    setStatus("loading");
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ subscription }),
      });
      const result = await res.json();

      if (result.success) setStatus("on");
      else { setStatus("off"); setError(result.message || "Gagal aktifin notifikasi."); }
    } catch (err) {
      setStatus("off");
      // err.name kasih tau JENIS error dari browser (AbortError, NotAllowedError, dll)
      // — ini penting buat bedain "device/jaringan gak bisa capai push service"
      // vs masalah lain yang beneran bisa kita benerin dari kode.
      const isAbortError = err.name === "AbortError" || /push service/i.test(err.message);
      setError(
        isAbortError
          ? "Perangkat/jaringan kamu gak berhasil terhubung ke layanan push notifikasi. Coba jaringan WiFi lain, atau pastikan Google Play Services aktif & terupdate."
          : (err.message || "Gagal aktifin notifikasi.")
      );
    }
  }

  if (status === "checking" || status === "unsupported" || status === "on") return null;

  return (
    <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#FAECE7] flex items-center justify-center flex-shrink-0">
          {status === "denied" ? <BellOff size={16} className="text-[#D85A30]" /> : <Bell size={16} className="text-[#D85A30]" />}
        </div>
        <div>
          <p className="text-sm font-medium text-[#1C1C1A]">
            {status === "denied" ? "Notifikasi HP diblokir" : "Aktifkan notifikasi di HP/browser"}
          </p>
          <p className="text-xs text-[#8B8D85]">
            {status === "denied"
              ? "Izinkan notifikasi lewat pengaturan browser lo biar gak ketinggalan order."
              : "Biar tetap dapet notif order & pembayaran walau tab tokku.id ketutup."}
          </p>
          {error && <p className="text-xs text-[#A32D2D] mt-1">{error}</p>}
        </div>
      </div>
      {status !== "denied" && (
        <button
          onClick={aktifkan}
          disabled={status === "loading"}
          className="text-sm bg-[#D85A30] text-white px-4 py-2 rounded-lg hover:bg-[#B84A25] transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {status === "loading" ? "Mengaktifkan..." : "Aktifkan"}
        </button>
      )}
    </div>
  );
}