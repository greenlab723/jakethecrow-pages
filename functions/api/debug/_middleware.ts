// functions/api/debug/_middleware.ts
// In production, debug endpoints are disabled.
// This middleware forces 404 for any /api/debug/* request.
export async function onRequest(): Promise<Response> {
  return new Response(JSON.stringify({ ok: false, error: "Not Found" }), {
    status: 404,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
