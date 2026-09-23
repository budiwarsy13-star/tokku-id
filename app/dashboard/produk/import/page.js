"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { validasiBarisProduk } from "@/lib/bulk-import-server";
import DashboardLayout from "@/components/DashboardLayout";
import { Upload, Download, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

const BATCH_SIZE = 25; // harus sama kayak MAX_ROWS_PER_REQUEST di route.js

export default function ImportProduk() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // hasil parse + validasi client
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [finalResults, setFinalResults] = useState(null); // hasil dari server, per baris
  const fileInputRef = useRef();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/masuk"; return; }
      const { data: storeData } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (!storeData) { window.location.href = "/dashboard"; return; }
      setStore(storeData);
      setLoading(false);
    }
    init();
  }, []);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFinalResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data.map((row, idx) => {
          const rowNumber = idx + 2; // +2: baris 1 = header, index mulai 0
          const validasi = validasiBarisProduk(row, rowNumber);
          return { ...validasi, raw: row };
        });
        setRows(parsed);
      },
      error: (err) => alert("Gagal baca file CSV: " + err.message),
    });
  }

  function resetImport() {
    setRows([]);
    setFileName("");
    setFinalResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function mulaiImport() {
    const baseValidRows = rows.filter((r) => r.valid);
    if (baseValidRows.length === 0) return;

    setImporting(true);
    setProgress({ done: 0, total: baseValidRows.length });

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      alert("Sesi login habis, silakan login ulang.");
      setImporting(false);
      return;
    }

    const allResults = [];
    for (let i = 0; i < baseValidRows.length; i += BATCH_SIZE) {
      const batch = baseValidRows.slice(i, i + BATCH_SIZE).map((r) => ({ ...r.raw, __rowNumber: r.rowNumber }));

      try {
        const res = await fetch("/api/produk/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ rows: batch }),
        });
        const data = await res.json();
        if (data.success) {
          allResults.push(...data.hasil);
        } else {
          batch.forEach((b) => allResults.push({ rowNumber: b.__rowNumber, success: false, errors: [data.message || "Gagal diproses server."] }));
        }
      } catch (err) {
        batch.forEach((b) => allResults.push({ rowNumber: b.__rowNumber, success: false, errors: [err.message] }));
      }

      setProgress({ done: Math.min(i + BATCH_SIZE, baseValidRows.length), total: baseValidRows.length });
    }

    setFinalResults(allResults);
    setImporting(false);
  }

  if (loading) {
    return <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><p className="text-[#8B8D85]">Memuat...</p></main>;
  }

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.length - validCount;
  const successCount = finalResults?.filter((r) => r.success).length || 0;
  const failCount = finalResults ? finalResults.length - successCount : 0;

  return (
    <DashboardLayout store={store} activeMenu="/dashboard/produk" headerTitle="Import Produk dari CSV">
      <div className="max-w-3xl space-y-6">

        {/* Langkah 1 — download template */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
          <h3 className="font-semibold text-[#1C1C1A] mb-1">1. Unduh template</h3>
          <p className="text-sm text-[#8B8D85] mb-3">
            Isi produk kamu di template ini. Kalau produk punya varian (ukuran/warna), isi kolom{" "}
            <code className="bg-[#F1EFE8] px-1 rounded">varian</code> dengan format{" "}
            <code className="bg-[#F1EFE8] px-1 rounded">Nama:Harga:Stok</code>, pisahkan tiap varian pakai{" "}
            <code className="bg-[#F1EFE8] px-1 rounded">|</code> — contoh: <code className="bg-[#F1EFE8] px-1 rounded">S:85000:5|M:85000:8</code>.
          </p>
          <a href="/template-produk-tokku.csv" download
            className="inline-flex items-center gap-2 text-sm border border-[#D85A30] text-[#D85A30] px-4 py-2 rounded-lg hover:bg-[#FDF1EC] transition-colors">
            <Download size={16} /> Download template CSV
          </a>
        </div>

        {/* Langkah 2 — upload */}
        <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
          <h3 className="font-semibold text-[#1C1C1A] mb-1">2. Upload file CSV kamu</h3>
          <p className="text-sm text-[#8B8D85] mb-3">
            Sudah punya toko di Shopee/Tokopedia? Kamu bisa ekspor produk jadi CSV dari Seller Center masing-masing,
            lalu sesuaikan kolomnya ke format template di atas sebelum upload ke sini.
          </p>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" id="csv-input" />
          <label htmlFor="csv-input"
            className="inline-flex items-center gap-2 text-sm bg-[#1C1C1A] text-white px-4 py-2 rounded-lg hover:bg-black cursor-pointer transition-colors">
            <Upload size={16} /> Pilih file CSV
          </label>
          {fileName && <p className="text-xs text-[#8B8D85] mt-2">File: {fileName} ({rows.length} baris terbaca)</p>}
        </div>

        {/* Langkah 3 — preview & validasi */}
        {rows.length > 0 && !finalResults && (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#1C1C1A]">3. Cek dulu sebelum diimport</h3>
              <div className="text-sm">
                <span className="text-green-700 font-medium">{validCount} valid</span>
                {errorCount > 0 && <span className="text-red-600 font-medium ml-3">{errorCount} error</span>}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border border-[#E5E2D9] rounded-lg divide-y divide-[#F1EFE8]">
              {rows.map((r) => (
                <div key={r.rowNumber} className="p-3 flex items-start gap-3 text-sm">
                  {r.valid ? (
                    <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1C1C1A] truncate">
                      Baris {r.rowNumber} — {r.data?.name || r.raw?.nama_produk || "(tanpa nama)"}
                    </p>
                    {r.errors.length > 0 && (
                      <p className="text-red-600 text-xs mt-0.5">{r.errors.join(" ")}</p>
                    )}
                    {r.warnings?.length > 0 && (
                      <p className="text-amber-600 text-xs mt-0.5 flex items-center gap-1">
                        <AlertTriangle size={12} /> {r.warnings.join(" ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button onClick={mulaiImport} disabled={validCount === 0 || importing}
                className="text-sm bg-[#D85A30] text-white px-4 py-2 rounded-lg hover:bg-[#B84A25] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                {importing && <Loader2 size={16} className="animate-spin" />}
                {importing ? `Mengimport... (${progress.done}/${progress.total})` : `Import ${validCount} produk valid`}
              </button>
              <button onClick={resetImport} disabled={importing}
                className="text-sm text-[#8B8D85] hover:text-[#1C1C1A] transition-colors">
                Batal, pilih file lain
              </button>
            </div>
            {errorCount > 0 && (
              <p className="text-xs text-[#8B8D85] mt-2">
                Baris yang error gak akan diimport — perbaiki di CSV lalu upload ulang kalau mau produk itu ikut masuk.
              </p>
            )}
          </div>
        )}

        {/* Langkah 4 — hasil akhir */}
        {finalResults && (
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-5">
            <h3 className="font-semibold text-[#1C1C1A] mb-1">Selesai</h3>
            <p className="text-sm text-[#8B8D85] mb-3">
              <span className="text-green-700 font-medium">{successCount} produk berhasil diimport</span>
              {failCount > 0 && <span className="text-red-600 font-medium"> · {failCount} gagal</span>}
            </p>
            <div className="max-h-72 overflow-y-auto border border-[#E5E2D9] rounded-lg divide-y divide-[#F1EFE8] mb-4">
              {finalResults.map((r) => (
                <div key={r.rowNumber} className="p-3 flex items-start gap-3 text-sm">
                  {r.success ? <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1C1C1A]">Baris {r.rowNumber}{r.name ? ` — ${r.name}` : ""}</p>
                    {r.errors?.length > 0 && <p className="text-red-600 text-xs">{r.errors.join(" ")}</p>}
                    {r.warnings?.length > 0 && <p className="text-amber-600 text-xs">{r.warnings.join(" ")}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <a href="/dashboard/produk" className="text-sm bg-[#1C1C1A] text-white px-4 py-2 rounded-lg hover:bg-black transition-colors">Lihat daftar produk</a>
              <button onClick={resetImport} className="text-sm text-[#8B8D85] hover:text-[#1C1C1A] transition-colors">Import file lain</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
