import { hapusSesi, cookieSesiHapus } from "@/lib/affiliate-server";

export async function POST(request) {
  await hapusSesi(request);
  return Response.json({ success: true }, { headers: { "Set-Cookie": cookieSesiHapus() } });
}
