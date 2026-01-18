// functions/api/member/token.ts
// /api/member/token
// - GET: health
// - POST: relay to GAS route=member/token (gateKey injected from env into JSON body)

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  if (request.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, route: "member/token", service: "cf-pages-functions__debug_route_v1", gasApiUrl: env.GAS_API_URL || "", cfEchoEnabled: true }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }
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

  let clientBody: any = {};
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      clientBody = await request.json();
    }
  } catch {
    clientBody = {};
  }
  
  // --- DEBUG: 受信ボディの route が debug/cf-echo なら最優先で返す ---
  if (clientBody && typeof clientBody === "object" && clientBody.route === "debug/cf-echo") {
    return json({ ok: true, debug: "cf-echo", receivedBody: clientBody }, 200);
  }

  // ✅ 受け取りを強化：
  // - { token: "..." } でもOK
  // - { data: { token: "..." } } でもOK
  const data =
    (clientBody && typeof clientBody === "object" && clientBody.data && typeof clientBody.data === "object")
      ? clientBody.data
      : (clientBody && typeof clientBody === "object" ? clientBody : {});

  const payload = {
  gateKey: API_GATE_KEY,
  route: (clientBody && typeof clientBody === "object" && typeof clientBody.route === "string" && clientBody.route)
    ? clientBody.route
    : "member/token",
  data,
  ip: request.headers.get("CF-Connecting-IP") || "",
};

  // --- DEBUG: Cloudflareが組み立てた内容をそのまま返す（GASへは送らない） ---
  if (payload.route === "debug/cf-echo") {
    return json({
      ok: true,
      debug: "cf-echo",
      gasApiUrl: GAS_API_URL,
      receivedBody: clientBody,
      computedData: data,
      payloadPreview: {
        route: payload.route,
        data: payload.data,
        ip: payload.ip
        // gateKey は秘匿のため返さない
      }
    }, 200);
  }
  
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
