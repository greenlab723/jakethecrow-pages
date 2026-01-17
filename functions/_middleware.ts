export const onRequest: PagesFunction = async ({ request, next }) => {
  const url = new URL(request.url);

  // /api で始まるリクエストだけを内部の Functions に流す
  if (url.pathname.startsWith("/api/")) {
    url.pathname = url.pathname.replace(/^\/api/, "");
    return next(new Request(url.toString(), request));
  }

  return next();
};
