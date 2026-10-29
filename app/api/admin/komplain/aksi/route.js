import { dengan, kirim } from "@/lib/admin-http";
import { aksiKomplain } from "@/lib/admin-aksi";

export const POST = dengan({ izinAksi: { putuskan: "komplain.tulis" } }, async ({ body, db, admin, ip, ua }) =>
  kirim(await aksiKomplain({ db, admin, jenis: body.jenis, id: body.id, status: body.status, catatan: body.catatan, ip, ua }))
);
