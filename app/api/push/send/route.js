import { createClient } from "@supabase/supabase-js";
import { kirimPush } from "@/lib/push-server";

// Endpoint perantara ini yang bikin buatNotifikasi() (dipanggil dari browser,
// baik dari checkout pembeli maupun dashboard seller) bisa nge-trigger push
// asli TANPA VAPID_PRIVATE_KEY pernah nyampur ke bundle client. Route ini
// jalan di server, jadi kredensialnya tetap aman.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { storeId, title, message, url, orderId } = await request.json();
    if (!storeId || !title) return Response.json({ success: false }, { status: 400 });

    await kirimPush(supabaseAdmin, storeId, { title, message, url, orderId });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Push send error:", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
