// functions/api/admin/view.ts
// Relay: Cloudflare Pages Functions -> GAS Api.gs
// Endpoint: /api/admin/view
// Env required (Pages project): GAS_API_URL, API_GATE_KEY

type Json = Record<string, unknown>;

function corsHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-GATE-KEY");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  h.set("Cache-Control", "no-store");
  return h;
}

async function readJson(request: Request): Promise<unknown> {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await request.json();

  const text = await request.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * body を「必ず object」に正規化する（GASへ投げるJSON用）
 */
function ensureObjectBody(body: unknown): Json {
  if (body && typeof body === "object" && !Array.isArray(body)) return body as Json;
  return { body };
}

export const onRequest: PagesFunction = async ({ request, env }) => {
  const method = request.method.toUpperCase();

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // GET = health for this endpoint
  if (method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, route: "/api/admin/view", via: "cloudflare->gas" }),
      {
        status: 200,
        headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }),
      }
    );
  }

  if (method !== "POST") {
    return new Response(null, { status: 405, headers: corsHeaders() });
  }

  const GAS_API_URL = (env as any).GAS_API_URL as string | undefined;
  const API_GATE_KEY = (env as any).API_GATE_KEY as string | undefined;

  if (!GAS_API_URL || !API_GATE_KEY) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "missing_env",
        detail: {
          has_GAS_API_URL: Boolean(GAS_API_URL),
          has_API_GATE_KEY: Boolean(API_GATE_KEY),
        },
      }),
      {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }),
      }
    );
  }

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "bad_request_body", detail: String(e) }),
      {
        status: 400,
        headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }),
      }
    );
  }

  // ----------------------------
  // IMPORTANT: gateKey は「必ず Cloudflare 側で注入」する
  // - クライアントが gateKey を送ってきても無視して上書き（漏洩対策）
  // - このエンドポイントは /api/admin/view なので route も強制
  // ----------------------------
  const payload = ensureObjectBody(body);
  payload.route = "admin/view";
  payload.gateKey = API_GATE_KEY;

  // GAS relay URL
  const base = GAS_API_URL.replace(/\/+$/, "");
  const gasUrl = base; // GAS側は body.route を見て分岐するので、クエリ path は不要

  let gasRes: Response;
  try {
    gasRes = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 互換のため残してOK（GAS側は基本読めない想定）
        "X-API-GATE-KEY": API_GATE_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "gas_fetch_failed", detail: String(e), gasUrl }),
      {
        status: 502,
        headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }),
      }
    );
  }

  const text = await gasRes.text();

  return new Response(text, {
    status: gasRes.status,
    headers: corsHeaders({
      "Content-Type": gasRes.headers.get("content-type") || "application/json; charset=utf-8",
    }),
  });
};
