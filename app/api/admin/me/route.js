// Dipakai halaman login: "apakah akun ini admin sah, dan MFA-nya sudah beres?" (tanpa data apa pun).
import { dengan, balas } from "@/lib/admin-http";

export const GET = dengan({ izin: null, wajibMfa: false }, async ({ admin, info }) =>
  balas({ success: true, email: admin.email, role: admin.role, aal: info.aal, mfaOk: info.mfaSegar })
);
