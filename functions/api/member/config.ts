// functions/api/member/config.ts
// /api/member/config
// - GET: health
// - POST: relay to GAS route=member/config (gateKey is injected from env into JSON body)

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  // GET = health
  if (request.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, route: "member/config", service: "cf-pages-functions" }),
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

  // Required env
  const GAS_API_URL = env.GAS_API_URL as string;
  const API_GATE_KEY = env.API_GATE_KEY as string;

  if (!GAS_API_URL || !API_GATE_KEY) {
    return json({ ok: false, error: "Server env missing (GAS_API_URL / API_GATE_KEY)" }, 500);
  }

  // Client body (optional)
  let clientBody: any = {};
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      clientBody = await request.json();
    }
  } catch {
    clientBody = {};
  }

  // ✅ GASへ送るpayload（gateKeyはbodyに埋め込み）
  // ※ この gateKey のキー名は「GAS側が参照している名前」に必ず合わせること
  const payload = {
    gateKey: API_GATE_KEY,
    route: "member/config",
    data: clientBody?.data ?? {},
    ip: request.headers.get("CF-Connecting-IP") || "",
  };

  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ✅ ここでは X-Api-Gate-Key を使わない（GASが拾えない/拾ってない前提）
      },
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

function json(obj: any, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...corsHeaders(),
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
