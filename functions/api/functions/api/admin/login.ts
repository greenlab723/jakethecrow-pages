// functions/api/admin/login.ts
// 目的：まず「/api/admin/login が Functions として確実に生える」ことを確認するスタブ
// 次の段階で GAS への中継に差し替える

type Json = Record<string, unknown>;

function jsonResponse(data: Json, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // CORS（ブラウザから叩くとき用。不要なら後で削ってOK）
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}

export const onRequest: PagesFunction = async ({ request }) => {
  const method = request.method.toUpperCase();

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Cache-Control": "no-store",
      },
    });
  }

  // GET は「ルートが生えているか確認」用（本番では後で塞いでOK）
  if (method === "GET") {
    return jsonResponse({
      ok: true,
      route: "/api/admin/login",
      method: "GET",
      message: "login endpoint is alive",
    });
  }

  if (method === "POST") {
    let body: unknown = null;
    try {
      const ct = request.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        body = await request.json();
      } else {
        body = { raw: await request.text() };
      }
    } catch (e) {
      return jsonResponse(
        {
          ok: false,
          route: "/api/admin/login",
          method: "POST",
          error: "failed_to_parse_body",
          detail: String(e),
        },
        400
      );
    }

    // まずはエコー（疎通確認）
    return jsonResponse({
      ok: true,
      route: "/api/admin/login",
      method: "POST",
      received: body,
    });
  }

  return jsonResponse(
    {
      ok: false,
      route: "/api/admin/login",
      error: "method_not_allowed",
      allowed: ["GET", "POST", "OPTIONS"],
    },
    405
  );
};
