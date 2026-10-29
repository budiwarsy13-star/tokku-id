import { dengan, kirim } from "@/lib/admin-http";
import { tampilkanPii } from "@/lib/admin-aksi";

export const POST = dengan({ izinAksi: { tampilkan: "pii.tampilkan" } }, async ({ body, db, admin, ip, ua }) =>
  kirim(await tampilkanPii({ db, admin, jenis: body.jenis, id: body.id, alasan: body.alasan, ip, ua }))
);
