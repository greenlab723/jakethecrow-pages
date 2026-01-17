type Json = Record<string, unknown>;

function jsonResponse(data: Json, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}

export const onRequest: PagesFunction = async ({ request }) => {
  const method = request.method.toUpperCase();

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

  if (method === "GET") {
    return jsonResponse({
      ok: true,
      route: "/admin/login",
      method: "GET",
      message: "admin/login endpoint is alive",
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
          route: "/admin/login",
          method: "POST",
          error: "failed_to_parse_body",
          detail: String(e),
        },
        400
      );
    }

    return jsonResponse({
      ok: true,
      route: "/admin/login",
      method: "POST",
      received: body,
    });
  }

  return jsonResponse(
    {
      ok: false,
      route: "/admin/login",
      error: "method_not_allowed",
      allowed: ["GET", "POST", "OPTIONS"],
    },
    405
  );
};
