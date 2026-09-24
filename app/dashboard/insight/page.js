"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Sparkles, TrendingUp, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function InsightPage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riwayat, setRiwayat] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      await muatRiwayat(storeData.id);
      setLoading(false);
    }
    init();
  }, []);

  async function muatRiwayat(storeId) {
    const { data } = await supabase
      .from("ai_insights")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(20);
    setRiwayat(data || []);
  }

  async function generateSekarang() {
    setError("");
    setGenerating(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    try {
      const res = await fetch("/api/insight/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ periodType: "harian" }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message);
      } else {
        await muatRiwayat(store.id);
        setExpandedId(data.insight.id);
      }
    } catch (err) {
      setError(err.message);
    }
    setGenerating(false);
  }

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  const terbaru = riwayat[0];
  const lainnya = riwayat.slice(1);

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/insight" headerTitle="Insight AI"
      headerRight={
        <button onClick={generateSekarang} disabled={generating}
          className="text-sm bg-[#D85A30] text-white px-4 py-2 rounded-lg hover:bg-[#B84A25] disabled:opacity-50 transition-colors flex items-center gap-2">
          {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {generating ? "Menganalisis..." : "Generate sekarang"}
        </button>
      }>
      <div className="max-w-2xl space-y-6">
        {error && (
          <div className="bg-[#FDECEC] border border-[#F0BABA] text-[#A32D2D] text-sm rounded-lg p-3">{error}</div>
        )}

        {!terbaru && !error && (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-8 text-center">
            <TrendingUp size={32} className="text-[#D85A30] mx-auto mb-3" />
            <p className="text-[#1C1C1A] font-medium mb-1">Belum ada insight</p>
            <p className="text-sm text-[#8B8D85]">Klik "Generate sekarang" buat lihat analisis toko kamu 7 hari terakhir.</p>
          </div>
        )}

        {terbaru && (
          <div>
            <p className="text-xs text-[#8B8D85] mb-2">
              Terbaru — {new Date(terbaru.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <div className="space-y-3">
              {(terbaru.insights || []).map((ins, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E2D9] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FAECE7] text-[#D85A30] flex items-center justify-center shrink-0 font-semibold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1C1C1A] text-sm mb-1">{ins.judul}</p>
                      <p className="text-sm text-[#5B6472] mb-2">{ins.penjelasan}</p>
                      <p className="text-sm text-[#1C1C1A] bg-[#FDF8F5] border border-[#F0D9CC] rounded-lg px-3 py-2">
                        💡 {ins.aksi_disarankan}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lainnya.length > 0 && (
          <div>
            <p className="text-xs text-[#8B8D85] mb-2 mt-6">Riwayat sebelumnya</p>
            <div className="space-y-2">
              {lainnya.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
                  <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-left">
                    <span className="text-[#1C1C1A]">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mr-2 ${r.period_type === "harian" ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FAECE7] text-[#D85A30]"}`}>
                        {r.period_type === "harian" ? "HARIAN" : "MINGGUAN"}
                      </span>
                      {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      <span className="text-[#8B8D85]"> · {(r.insights || []).length} insight</span>
                    </span>
                    {expandedId === r.id ? <ChevronUp size={16} className="text-[#8B8D85]" /> : <ChevronDown size={16} className="text-[#8B8D85]" />}
                  </button>
                  {expandedId === r.id && (
                    <div className="px-4 pb-4 space-y-2 border-t border-[#F1EFE8] pt-3">
                      {(r.insights || []).map((ins, i) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium text-[#1C1C1A]">{ins.judul}</p>
                          <p className="text-[#5B6472]">{ins.penjelasan}</p>
                          <p className="text-[#5B6472] italic">💡 {ins.aksi_disarankan}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
