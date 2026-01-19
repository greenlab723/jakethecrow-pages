// functions/api/_middleware.ts
// Ensure undefined /api/* routes return JSON 404 instead of falling back to Pages HTML.
// Existing defined routes will continue as normal via context.next().

export async function onRequest(context: any): Promise<Response> {
  const { request } = context;

  // Preflight should behave as before
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Try to route to an existing function/asset
  const res: Response = await context.next();

  // If something under /api/* is not matched, Pages may return HTML (often 200).
  // Convert "not found" HTML-ish responses into JSON 404.
  const ct = (res.headers.get("Content-Type") || "").toLowerCase();
  const url = new URL(request.url);
  const isApi = url.pathname.startsWith("/api/");

  if (isApi) {
    // If it is already a non-200, keep as-is
    if (res.status !== 200) return res;

    // If it looks like an HTML fallback, treat as not found
    if (ct.includes("text/html")) {
      return json404();
    }
  }

  return res;
}

function json404(): Response {
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
