// Pemindai struktural: jalankan dari akar project:  node tests/admin-guard-scan.mjs
import fs from "fs"; import path from "path";
const akar = process.cwd(); let gagal = 0;
const ok = (n, c, d = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : d); if (!c) gagal++; };
const jalan = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? jalan(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const baca = (f) => fs.readFileSync(f, "utf8");
const rel = (f) => path.relative(akar, f);
const kode = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1"); // buang komentar, periksa KODE-nya

// Endpoint di bawah /api/admin yang SENGAJA tidak memakai pembungkus dengan() — wajib terdaftar di sini beserta alasannya.
// Dicetak sebagai PERINGATAN setiap kali tes dijalankan supaya tidak terlupakan. Route admin BARU yang tidak terdaftar = tes gagal.
const PENGECUALIAN = {
  "app/api/admin/affiliate/payout/route.js": "memakai ADMIN_SECRET statis (bearer tunggal). Di LUAR sistem admin panel: tanpa MFA, tanpa identitas admin, tanpa log audit, tanpa pemisahan peran.",
};
const semuaRoutes = jalan(path.join(akar, "app/api/admin")).filter((f) => f.endsWith("route.js"));
for (const f of semuaRoutes) { const r = rel(f).split(path.sep).join("/"); if (PENGECUALIAN[r]) console.log("WARN  DIKECUALIKAN:", r, "->", PENGECUALIAN[r]); }
const routes = semuaRoutes.filter((f) => !PENGECUALIAN[rel(f).split(path.sep).join("/")]);
ok(`menemukan route admin yang dijaga (${routes.length})`, routes.length >= 14);
ok("semua pengecualian yang terdaftar memang masih ada (daftar tidak basi)", Object.keys(PENGECUALIAN).every((r) => fs.existsSync(path.join(akar, r))));
const METODE = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
for (const f of routes) {
  const s = baca(f); const diekspor = [];
  for (const m of METODE) {
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(s)) { ok(`${rel(f)}: ${m} TIDAK boleh berupa fungsi polos`, false); continue; }
    if (new RegExp(`export\\s+const\\s+${m}\\s*=\\s*dengan\\(`).test(s)) diekspor.push(m);
    else if (new RegExp(`export\\s+(const|let|var)\\s+${m}\\b`).test(s)) ok(`${rel(f)}: ${m} harus memakai dengan(...)`, false);
  }
  ok(`${rel(f)}: semua metode HTTP dibungkus dengan() [${diekspor.join(",")}]`, diekspor.length >= 1);
  ok(`${rel(f)}: handler POST wajib memakai izinAksi (izin per-aksi terpusat)`, !diekspor.includes("POST") || /izinAksi\s*:/.test(s));
  ok(`${rel(f)}: GET wajib mendeklarasikan izin`, !diekspor.includes("GET") || /izin\s*:/.test(s));
  ok(`${rel(f)}: tidak membuat klien Supabase sendiri / tidak memakai klien anon`, !/createClient|@\/lib\/supabase["']/.test(kode(s)));
  ok(`${rel(f)}: tidak menyentuh store_secrets`, !/store_secrets/.test(kode(s)));
}
const berkas = [...jalan(path.join(akar, "lib")).filter((f) => /lib\/admin-/.test(f)), ...routes];
for (const f of berkas) ok(`${rel(f)}: tidak menyentuh store_secrets / token rahasia`, !/store_secrets|meta_access_token|ga4_api_secret/.test(kode(baca(f))));
const sem = (f) => baca(f).replace(/\/\/.*$/gm, "");
ok("tidak ada admin route yang membaca dari env sembarangan selain lewat lib/admin-server", routes.every((f) => !/process\.env/.test(sem(f))));

const halaman = jalan(path.join(akar, "app/admin")).filter((f) => f.endsWith(".js"));
for (const f of halaman) {
  const s = baca(f);
  ok(`${rel(f)}: tidak memakai klien Supabase publik (data admin hanya lewat /api/admin)`, !/from\s+["']@\/lib\/supabase["']/.test(s));
  ok(`${rel(f)}: tidak memakai dangerouslySetInnerHTML`, !/dangerouslySetInnerHTML/.test(s));
  ok(`${rel(f)}: tidak memakai localStorage (sesi admin hanya di sessionStorage)`, !/localStorage/.test(s));
}
const komp = jalan(path.join(akar, "components/admin")).filter((f) => f.endsWith(".js"));
for (const f of komp) ok(`${rel(f)}: tanpa dangerouslySetInnerHTML / klien publik`, !/dangerouslySetInnerHTML|from\s+["']@\/lib\/supabase["']/.test(baca(f)));
console.log(gagal === 0 ? "\nSEMUA LOLOS" : `\n${gagal} GAGAL`); process.exit(gagal ? 1 : 0);
