import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type PushItem = { id: number; notification_id: number; recipient_id: string; title: string; body: string; attempts: number };
type Device = { id: string; token: string; installation_id: string; platform: "web" | "android" };
type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const encoded = (value: string) => b64url(new TextEncoder().encode(value));
let cachedBearer: { value: string; expiresAt: number } | null = null;

function roleFromGatewayJwt(header: string | null) {
  const jwt = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!jwt) return null;
  try {
    const segment = jwt.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(segment)).role as string | undefined;
  } catch { return null; }
}

async function fcmBearer(account: ServiceAccount) {
  if (cachedBearer && cachedBearer.expiresAt > Date.now() + 60_000) return cachedBearer.value;
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = encoded(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = encoded(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = `${unsigned}.${b64url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`fcm_oauth_${response.status}`);
  const token = await response.json();
  cachedBearer = { value: token.access_token as string, expiresAt: Date.now() + 55 * 60_000 };
  return cachedBearer.value;
}

async function sendFcm(account: ServiceAccount, bearer: string, device: Device, item: PushItem) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      message: {
        token: device.token,
        notification: { title: item.title, body: item.body },
        data: { screen: "cuenta", notification_id: String(item.notification_id) },
        android: { priority: "HIGH" },
        webpush: { headers: { Urgency: "high" }, fcm_options: { link: "/?screen=cuenta" } },
      },
    }),
  });
  if (response.ok) return { ok: true as const };
  const body = await response.text();
  const invalid = response.status === 404 || /UNREGISTERED|registration-token-not-registered/i.test(body);
  return { ok: false as const, invalid, status: response.status };
}

Deno.serve(async request => {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  // The scheduler sends the project service-role JWT from Supabase Vault.
  // The gateway verifies its signature before this handler; this check rejects
  // public/anonymous API keys even if someone invokes the URL directly.
  if (roleFromGatewayJwt(request.headers.get("authorization")) !== "service_role") {
    return json(401, { error: "worker_auth_required" });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const firebaseJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!url || !serviceKey || !firebaseJson) return json(503, { error: "push_not_configured" });
  let account: ServiceAccount;
  try { account = JSON.parse(firebaseJson); }
  catch { return json(503, { error: "firebase_credentials_invalid" }); }
  if (!account.project_id || !account.client_email || !account.private_key) return json(503, { error: "firebase_credentials_incomplete" });

  const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: items, error: claimError } = await db.rpc("claim_yoresuelvo_push_batch");
  if (claimError) return json(500, { error: "push_queue_claim_failed" });
  let sent = 0;
  let retried = 0;
  for (const item of (items ?? []) as PushItem[]) {
    try {
      const [preference, deviceResult] = await Promise.all([
        db.from("notification_preferences").select("push_updates").eq("user_id", item.recipient_id).maybeSingle(),
        db.from("push_devices").select("id,token,installation_id,platform").eq("user_id", item.recipient_id).eq("is_active", true),
      ]);
      if (preference.error || deviceResult.error) throw new Error("push_recipient_lookup_failed");
      const devices = (deviceResult.data ?? []) as Device[];
      if (preference.data?.push_updates !== true || devices.length === 0) {
        await db.rpc("finish_yoresuelvo_push", { p_id: item.id, p_error: null });
        sent++;
        continue;
      }
      const bearer = await fcmBearer(account);
      let failed = false;
      for (const device of devices) {
        const result = await sendFcm(account, bearer, device, item);
        if (result.ok) continue;
        if (result.invalid) {
          await db.from("push_devices").update({ is_active: false }).eq("id", device.id);
          continue;
        }
        failed = true;
      }
      if (failed && item.attempts < 8) {
        await db.rpc("finish_yoresuelvo_push", { p_id: item.id, p_error: "fcm_delivery_failed" });
        retried++;
      } else {
        await db.rpc("finish_yoresuelvo_push", { p_id: item.id, p_error: null });
        sent++;
      }
    } catch {
      if (item.attempts < 8) {
        await db.rpc("finish_yoresuelvo_push", { p_id: item.id, p_error: "push_worker_error" });
        retried++;
      } else {
        await db.rpc("finish_yoresuelvo_push", { p_id: item.id, p_error: null });
        sent++;
      }
    }
  }
  return json(200, { claimed: items?.length ?? 0, sent, retried });
});
