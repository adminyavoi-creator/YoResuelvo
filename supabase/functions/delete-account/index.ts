import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { error: "method_not_allowed" });

  const authorization = request.headers.get("authorization");
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !projectUrl || !anonKey || !serviceRoleKey) {
    return respond(401, { error: "authentication_required" });
  }

  let confirmation = "";
  try {
    const body = await request.json();
    confirmation = typeof body?.confirmation === "string" ? body.confirmation.trim().toUpperCase() : "";
  } catch {
    return respond(400, { error: "confirmation_required" });
  }
  if (confirmation !== "ELIMINAR") return respond(400, { error: "confirmation_required" });

  const userClient = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userResult, error: userError } = await userClient.auth.getUser();
  if (userError || !userResult.user) return respond(401, { error: "authentication_required" });

  const userId = userResult.user.id;
  const admin = createClient(projectUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Provider photos are stored under the authenticated account's folder.
  const photoBucket = admin.storage.from("provider-photos");
  for (;;) {
    const { data: files, error: listError } = await photoBucket.list(userId, { limit: 100, offset: 0 });
    if (listError) {
      console.error("delete-account: could not list account photos", listError.message);
      return respond(500, { error: "deletion_temporarily_unavailable" });
    }
    const paths = (files ?? []).filter(file => file.id && file.name).map(file => `${userId}/${file.name}`);
    if (paths.length) {
      const { error: removeError } = await photoBucket.remove(paths);
      if (removeError) {
        console.error("delete-account: could not remove account photos", removeError.message);
        return respond(500, { error: "deletion_temporarily_unavailable" });
      }
    }
    if (!paths.length || (files ?? []).length < 100) break;
  }

  // This server-only transaction deletes account-linked service data and
  // shared chats/reviews, while detaching confirmed tickets for safety.
  const { error: preparationError } = await admin.rpc("prepare_account_deletion", {
    p_user_id: userId,
  });
  if (preparationError) {
    console.error("delete-account: could not prepare account removal", preparationError.message);
    return respond(500, { error: "deletion_temporarily_unavailable" });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId, false);
  if (deleteError) {
    console.error("delete-account: auth deletion failed", deleteError.message);
    return respond(500, { error: "deletion_temporarily_unavailable" });
  }

  return respond(200, { deleted: true });
});
