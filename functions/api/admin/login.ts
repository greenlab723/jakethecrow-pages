export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({ ok: true, route: "/api/admin/login", message: "alive" }),
    { headers: { "Content-Type": "application/json" } }
  );
};
