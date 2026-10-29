import { dengan, kirim } from "@/lib/admin-http";
import { aksiKeuangan } from "@/lib/admin-aksi";

export const POST = dengan({ izinAksi: { pencairan: "keuangan.tulis", koreksi: "keuangan.tulis" } }, async ({ body, db, admin, ip, ua }) =>
  kirim(await aksiKeuangan({ db, admin, storeId: body.storeId, jenis: body.aksi, jumlah: body.jumlah, referensi: body.referensi, catatan: body.catatan, ip, ua }))
);
