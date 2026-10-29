"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Bot, Plus, Pencil, Trash2, Check, X, GripVertical, MessageCircle } from "lucide-react";

export default function ChatBotPage() {
  const [store, setStore] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddFAQ, setShowAddFAQ] = useState(false);
  const [newFAQ, setNewFAQ] = useState({ question: "", answer: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      await fetchTemplates(storeData.id);
      setLoading(false);
    }
    init();
  }, []);

  async function fetchTemplates(storeId) {
    const res = await fetch(`/api/portal/chat-templates?store_id=${storeId}`);
    const data = await res.json();
    setTemplates(data.templates || []);
  }

  const welcome = templates.find((t) => t.type === "welcome");
  const faqs = templates.filter((t) => t.type === "faq").sort((a, b) => a.sort_order - b.sort_order);

  async function saveEdit(t) {
    setSaving(true);
    await fetch("/api/portal/chat-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, ...editData }),
    });
    setEditingId(null);
    setEditData({});
    await fetchTemplates(store.id);
    setSaving(false);
  }

  async function toggleActive(t) {
    await fetch("/api/portal/chat-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
    });
    await fetchTemplates(store.id);
  }

  async function hapus(id) {
    if (!confirm("Hapus template FAQ ini?")) return;
    await fetch(`/api/portal/chat-templates?id=${id}`, { method: "DELETE" });
    await fetchTemplates(store.id);
  }

  async function tambahFAQ() {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) return;
    setSaving(true);
    await fetch("/api/portal/chat-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: store.id,
        type: "faq",
        question: newFAQ.question,
        answer: newFAQ.answer,
        sort_order: faqs.length + 1,
        is_active: true,
      }),
    });
    setNewFAQ({ question: "", answer: "" });
    setShowAddFAQ(false);
    await fetchTemplates(store.id);
    setSaving(false);
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditData({ question: t.question || "", answer: t.answer, is_active: t.is_active });
  }

  if (loading) return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <p className="text-[#8B8D85]">Memuat...</p>
    </main>
  );

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/chat-bot" headerTitle="Chat Bot">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1C1C1A]">Template Chat Bot</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <div className="space-y-5">

          {/* Pesan Sambutan */}
          <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E2D9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-[#D85A30]" />
                <h2 className="font-semibold text-[#1C1C1A] text-sm">Pesan sambutan</h2>
              </div>
              {welcome && (
                <button onClick={() => toggleActive(welcome)}
                  className={`text-xs px-3 py-1 rounded-full font-medium ${welcome.is_active ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F1EFE8] text-[#5B6472]"}`}>
                  {welcome.is_active ? "Aktif" : "Nonaktif"}
                </button>
              )}
            </div>
            {welcome && (
              <div className="p-5">
                {editingId === welcome.id ? (
                  <div className="space-y-3">
                    <textarea rows={4} value={editData.answer}
                      onChange={(e) => setEditData((p) => ({ ...p, answer: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30] resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(welcome)} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#D85A30] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                        <Check size={14} /> Simpan
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-4 py-2 border border-[#E5E2D9] text-[#5B6472] rounded-lg text-sm">
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[#5B6472] leading-relaxed">{welcome.answer}</p>
                    <button onClick={() => startEdit(welcome)}
                      className="shrink-0 p-1.5 text-[#8B8D85] hover:text-[#1C1C1A] hover:bg-[#F1EFE8] rounded-lg">
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FAQ List */}
          <div className="bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E2D9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-[#D85A30]" />
                <h2 className="font-semibold text-[#1C1C1A] text-sm">Pertanyaan umum (FAQ)</h2>
              </div>
              <button onClick={() => setShowAddFAQ(true)}
                className="flex items-center gap-1.5 text-sm text-[#D85A30] font-medium hover:underline">
                <Plus size={14} /> Tambah
              </button>
            </div>

            {showAddFAQ && (
              <div className="p-5 border-b border-[#E5E2D9] bg-[#FAFAF7] space-y-3">
                <input type="text" placeholder="Pertanyaan..." value={newFAQ.question}
                  onChange={(e) => setNewFAQ((p) => ({ ...p, question: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
                <textarea rows={3} placeholder="Jawaban..." value={newFAQ.answer}
                  onChange={(e) => setNewFAQ((p) => ({ ...p, answer: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30] resize-none" />
                <div className="flex gap-2">
                  <button onClick={tambahFAQ} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#D85A30] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    <Check size={14} /> Tambah FAQ
                  </button>
                  <button onClick={() => setShowAddFAQ(false)}
                    className="px-4 py-2 border border-[#E5E2D9] text-[#5B6472] rounded-lg text-sm">
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-[#E5E2D9]">
              {faqs.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-[#8B8D85]">
                  Belum ada FAQ. Tambah pertanyaan yang sering ditanya pembeli.
                </p>
              )}
              {faqs.map((faq) => (
                <div key={faq.id} className={`p-5 ${!faq.is_active ? "opacity-50" : ""}`}>
                  {editingId === faq.id ? (
                    <div className="space-y-3">
                      <input type="text" value={editData.question}
                        onChange={(e) => setEditData((p) => ({ ...p, question: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
                      <textarea rows={3} value={editData.answer}
                        onChange={(e) => setEditData((p) => ({ ...p, answer: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30] resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(faq)} disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#D85A30] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                          <Check size={14} /> Simpan
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-4 py-2 border border-[#E5E2D9] text-[#5B6472] rounded-lg text-sm">
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <GripVertical size={16} className="text-[#C5C3BB] mt-0.5 shrink-0 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1C1C1A] mb-1">{faq.question}</p>
                        <p className="text-sm text-[#5B6472] leading-relaxed">{faq.answer}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleActive(faq)}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${faq.is_active ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F1EFE8] text-[#5B6472]"}`}>
                          {faq.is_active ? "On" : "Off"}
                        </button>
                        <button onClick={() => startEdit(faq)}
                          className="p-1.5 text-[#8B8D85] hover:text-[#1C1C1A] hover:bg-[#F1EFE8] rounded-lg">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => hapus(faq.id)}
                          className="p-1.5 text-[#A32D2D] hover:bg-[#FBEAEA] rounded-lg">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <p className="text-xs font-medium text-[#8B8D85] uppercase tracking-wider mb-3">Preview tampilan di chat pembeli</p>
            <div className="bg-[#F1EFE8] rounded-2xl p-4 max-w-sm mx-auto">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-[#D85A30] px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{store?.name || "Nama Toko"}</p>
                    <p className="text-white/70 text-[10px]">Chat Bot</p>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[280px]">
                  {welcome?.is_active && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#D85A30]/10 flex items-center justify-center shrink-0">
                        <Bot size={12} className="text-[#D85A30]" />
                      </div>
                      <div className="bg-[#F1EFE8] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
                        <p className="text-[11px] text-[#1C1C1A] leading-relaxed">{welcome.answer}</p>
                      </div>
                    </div>
                  )}
                  {faqs.filter((f) => f.is_active).length > 0 && (
                    <div className="flex gap-2 mt-2">
                      <div className="w-6 h-6 shrink-0" />
                      <div className="space-y-1.5 w-full">
                        <p className="text-[10px] text-[#8B8D85]">Pilih pertanyaan:</p>
                        {faqs.filter((f) => f.is_active).slice(0, 4).map((faq) => (
                          <button key={faq.id}
                            className="block w-full text-left text-[11px] text-[#D85A30] border border-[#D85A30]/30 rounded-lg px-3 py-1.5 hover:bg-[#D85A30]/5 transition-colors">
                            {faq.question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-[#E5E2D9] px-3 py-2 flex gap-2">
                  <input disabled placeholder="Ketik pesan..."
                    className="flex-1 text-[11px] text-[#8B8D85] bg-[#F1EFE8] rounded-full px-3 py-1.5 outline-none" />
                  <div className="w-7 h-7 rounded-full bg-[#D85A30] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}