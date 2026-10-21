import { createClient } from "@supabase/supabase-js";
import { hapusSesi } from "@/lib/buyer-auth-server";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  await hapusSesi(admin, request);
  return Response.json({ success: true });
}
