// functions/api/member/request-edit.ts
// /api/member/request-edit
// - GET: health
// - POST: (1) IP rate limit (soft) (2) Turnstile siteverify (3) relay to GAS route=member/request-edit
//
// Client should send: { data: { ..., cfTurnstileToken: "..." } }

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

const TURNSTILE_VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify"; // official endpoint :contentReference[oaicite:2]{index=2}

// ---- Soft in-memory rate limit (per instance) ----
// Note: Pages Functions can run on multiple isolates; treat as "best-effort".
// Still valuable as a speed bump; combine with Turnstile + GAS cooldown for real protection.
const bucket = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000; // 60 sec
const RATE_MAX = 5; // per IP per window (tweak as needed)

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  // GET = health
  if (request.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, route: "member/request-edit", service: "cf-pages-functions", turnstile: true }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }
    );
  }

  // OPTIONS = CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // POST only
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  const GAS_API_URL = env.GAS_API_URL as string;
  const API_GATE_KEY = env.API_GATE_KEY as string;
  const TURNSTILE_SECRET = env.TURNSTILE_SECRET as string;

  if (!GAS_API_URL || !API_GATE_KEY) {
    return json({ ok: false, error: "Server env missing (GAS_API_URL / API_GATE_KEY)" }, 500);
  }
  if (!TURNSTILE_SECRET) {
    return json({ ok: false, error: "Server env missing (TURNSTILE_SECRET)" }, 500);
  }

  // Parse client body (must be JSON)
  let clientBody: any = {};
  try {
    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return json({ ok: false, error: "Content-Type must be application/json" }, 400);
    }
    clientBody = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const data = clientBody?.data ?? {};
  const cfTurnstileToken = String(data?.cfTurnstileToken || "").trim();

  // Basic requirement
  if (!cfTurnstileToken) {
    // Keep response generic to avoid giving attackers detailed hints
    return json({ ok: false, error: "Forbidden" }, 403);
  }

  const ip = String(request.headers.get("CF-Connecting-IP") || "");

  // (1) Soft IP rate limit
  if (ip) {
    const now = Date.now();
    const cur = bucket.get(ip);
    if (!cur || now >= cur.resetAt) {
      bucket.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else {
      cur.count += 1;
      if (cur.count > RATE_MAX) {
        // 429 Too Many Requests
        return json({ ok: false, error: "Too Many Requests" }, 429);
      }
      bucket.set(ip, cur);
    }
  }

  // (2) Turnstile siteverify
  const ok = await verifyTurnstileToken({
    secret: TURNSTILE_SECRET,
    response: cfTurnstileToken,
    remoteip: ip || undefined, // optional, helps abuse mitigation :contentReference[oaicite:3]{index=3}
  });

  if (!ok) {
    // 403: do not reveal which part failed (anti-enumeration / anti-bot)
    return json({ ok: false, error: "Forbidden" }, 403);
  }

  // (3) Relay to GAS (remove cfTurnstileToken before forwarding)
  const forwardedData = { ...data };
  delete forwardedData.cfTurnstileToken;

  const payload = {
    gateKey: API_GATE_KEY,
    route: "member/request-edit",
    data: forwardedData,
    ip,
  };

  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: {
        ...corsHeaders(),
        "Content-Type": res.headers.get("Content-Type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return json({ ok: false, error: "Upstream fetch failed", detail: String(e?.message || e) }, 502);
  }
}

async function verifyTurnstileToken(args: {
  secret: string;
  response: string;
  remoteip?: string;
}): Promise<boolean> {
  // Turnstile siteverify accepts POST (FormData or JSON) :contentReference[oaicite:4]{index=4}
  const form = new FormData();
  form.append("secret", args.secret);
  form.append("response", args.response);
  if (args.remoteip) form.append("remoteip", args.remoteip);

  const resp = await fetch(TURNSTILE_VERIFY_ENDPOINT, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) return false;

  let jsonResp: TurnstileVerifyResponse | null = null;
  try {
    jsonResp = (await resp.json()) as TurnstileVerifyResponse;
  } catch {
    return false;
  }

  return !!jsonResp?.success;
}

function json(obj: any, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-GATE-KEY",
  };
}
