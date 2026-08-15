import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ success: false }, { status: 401 });

  const { data: store } = await supabase.from("stores").select("id").eq("user_id", user.id).maybeSingle();
  if (!store) return Response.json({ success: false, message: "Toko gak ketemu." }, { status: 404 });

  const { subscription } = await request.json();
  if (!subscription?.endpoint) {
    return Response.json({ success: false, message: "Data subscription gak valid." }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      store_id: store.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return Response.json({ success: false, message: error.message }, { status: 500 });
  return Response.json({ success: true });
}
