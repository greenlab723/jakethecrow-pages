// functions/api/[[catchall]].ts
// Catch-all for undefined /api/* routes to avoid Pages HTML fallback.
// More specific routes (e.g. /api/member/token) will take precedence.

export async function onRequest(context: any): Promise<Response> {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  return new Response(JSON.stringify({ ok: false, error: "Not Found" }), {
    status: 404,
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
