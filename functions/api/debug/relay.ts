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
