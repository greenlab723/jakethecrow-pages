export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({ status: "ok", from: "cloudflare-functions" }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
