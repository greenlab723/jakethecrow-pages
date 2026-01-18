// functions/api/member/config.ts

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  // GET = health
  if (request.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, route: "member/config", service: "cf-pages-functions" }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  // OPTIONS = CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // POST only
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  // 必須 env
  const GAS_API_URL = env.GAS_API_URL as string;         // 例: https://script.google.com/macros/s/XXXX/exec
  const API_GATE_KEY = env.API_GATE_KEY as string;       // gateKey（クライアントからは送らせない）

  if (!GAS_API_URL || !API_GATE_KEY) {
    return json({ ok: false, error: "Server env missing (GAS_API_URL / API_GATE_KEY)" }, 500);
  }

  // クライアントのPOSTボディ（任意）
  let clientBody: any = {};
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      clientBody = await request.json();
    }
  } catch {
    // body無し/壊れてても member/config は動ける想定なので握りつぶし
    clientBody = {};
  }

  // GASへ投げるペイロード（route固定）
  const payload = {
    route: "member/config",
    data: clientBody?.data ?? {},  // 将来拡張用（例: localeなど）
    meta: {
      ip: request.headers.get("CF-Connecting-IP") || "",
      ua: request.headers.get("User-Agent") || "",
      // 必要なら cfRay なども
    },
  };

  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Gate-Key": API_GATE_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    // GASがJSONを返す前提。万一JSONでなければ、そのまま返す（デバッグしやすく）
    const headers = {
      ...corsHeaders(),
      "Content-Type": res.headers.get("Content-Type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    };

    return new Response(text, { status: res.status, headers });
  } catch (e: any) {
    return json({ ok: false, error: "Upstream fetch failed", detail: String(e?.message || e) }, 502);
  }
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
