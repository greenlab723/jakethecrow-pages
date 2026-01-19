// functions/api/_lib/relay.ts
export type Json = Record<string, any>;

function jsonResponse(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-GATE-KEY");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function handleOptions() {
  return jsonResponse({ ok: true }, { status: 204 });
}

export async function readJsonBodySafe(request: Request): Promise<Json> {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function buildGasPayload(args: {
  route: string;
  data?: Json;
  env: { API_GATE_KEY: string };
}): Json {
  // ★あなたの前提：GAS側は body.gateKey を検証（headerは使わない）
  return {
    gateKey: args.env.API_GATE_KEY,
    route: args.route,
    data: args.data ?? {},
  };
}

export async function postToGas(args: {
  env: { GAS_API_URL: string; API_GATE_KEY: string };
  route: string;
  data?: Json;
  debug?: boolean;
}): Promise<{ ok: boolean; status: number; body: any; relayPayload: Json }> {
  const relayPayload = buildGasPayload({ route: args.route, data: args.data, env: args.env });

  const res = await fetch(args.env.GAS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(relayPayload),
  });

  let body: any = null;
  const ct = res.headers.get("Content-Type") || "";
  try {
    if (ct.includes("application/json")) body = await res.json();
    else body = await res.text();
  } catch (e: any) {
    body = { parseError: String(e?.message || e), contentType: ct };
  }

  return { ok: res.ok, status: res.status, body, relayPayload };
}

export { jsonResponse };
