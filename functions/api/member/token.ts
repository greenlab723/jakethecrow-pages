// functions/api/member/token.ts
// /api/member/token
// - GET: minimal health
// - POST: relay to GAS route="member/token" (gateKey injected from env into JSON body)

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  // Minimal health check (do not leak env values)
  if (request.method === "GET") {
    return json(
      {
        ok: true,
        route: "member/token",
        service: "cf-pages-functions",
      },
      200,
      { cors: false } // GET health doesn't need permissive CORS
    );
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  const GAS_API_URL = env.GAS_API_URL as string;
  const API_GATE_KEY = env.API_GATE_KEY as string;

  if (!GAS_API_URL || !API_GATE_KEY) {
    return json({ ok: false, error: "Server env missing (GAS_API_URL / API_GATE_KEY)" }, 500);
  }

  // Parse JSON safely
  let clientBody: any = {};
  try {
    const text = await request.text();
    clientBody = text ? JSON.parse(text) : {};
  } catch {
    clientBody = {};
  }

  // Accept either:
  // - { token: "..." }
  // - { data: { token: "..." } }
  const data =
    clientBody && typeof clientBody === "object" && clientBody.data && typeof clientBody.data === "object"
      ? clientBody.data
      : clientBody && typeof clientBody === "object"
        ? clientBody
        : {};

  const payload = {
    gateKey: API_GATE_KEY,
    route: "member/token",
    data,
    ip: request.headers.get("CF-Connecting-IP") || "",
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

function json(obj: any, status = 200, opt?: { cors?: boolean }): Response {
  const useCors = opt?.cors !== false;
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...(useCors ? corsHeaders() : {}),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-GATE-KEY",
  };
}

