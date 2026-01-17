export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));

    // ここはまず「疎通」目的の最小レスポンス
    return new Response(
      JSON.stringify({
        ok: true,
        route: "/api/admin/login",
        received: body,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        route: "/api/admin/login",
        error: String(err),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

// GETなどを弾く（405を明示）
export const onRequestGet: PagesFunction = async () => {
  return new Response(null, { status: 405 });
};
