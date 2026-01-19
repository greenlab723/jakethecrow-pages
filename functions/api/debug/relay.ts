// functions/api/debug/relay.ts
export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // ★Content-Typeに依存せず、生のbodyを必ず取る
  let rawText = "";
  let clientBody: any = {};
  try {
    rawText = await request.text();
    clientBody = rawText ? JSON.parse(rawText) : {};
  } catch {
    clientBody = {};
  }

  const routeObserved =
    clientBody && typeof clientBody === "object" && typeof clientBody.route === "string" && clientBody.route
      ? clientBody.route
      : "member/token";

  const dataObserved =
    (clientBody && typeof clientBody === "object" && clientBody.data && typeof clientBody.data === "object")
      ? clientBody.data
      : (clientBody && typeof clientBody === "object" ? clientBody : {});

  const relayPayload = {
    gateKey: env.API_GATE_KEY || "",
    route: routeObserved,
    data: dataObserved,
    ip: request.headers.get("CF-Connecting-IP") || "",
  };

  return json(
    {
      ok: true,
      where: "/api/debug/relay",
      method: request.method,
      buildId: "debug-relay__2026-01-19__v3__RAW_TEXT",
      gasApiUrl: env.GAS_API_URL || "",
      rawTextLength: rawText.length,
      rawTextPreview: rawText.slice(0, 200),
      clientBody,
      relayPayloadPreview: {
        route: relayPayload.route,
        data: relayPayload.data,
        ip: relayPayload.ip,
        hasGateKey: !!relayPayload.gateKey, // gateKey自体は秘匿
      },
      notes: ["This endpoint DOES NOT call GAS.", "It only shows what would be relayed."],
    },
    200
  );
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
