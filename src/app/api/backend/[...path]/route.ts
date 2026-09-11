const API_ORIGIN = process.env.API_ORIGIN || "https://gossipuerj-api.onrender.com";

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const url = new URL(request.url);
  const rawPath = path.join("/");
  const cleanPath = rawPath.startsWith("api/") ? rawPath.slice(4) : rawPath;
  const target = `${API_ORIGIN}/api/${cleanPath}${url.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const accept = request.headers.get("accept");

  if (authorization) headers.set("authorization", authorization);
  if (accept) headers.set("accept", accept);

  let bodyData: ArrayBuffer | undefined = undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > 0) {
      bodyData = buffer;
      if (contentType) headers.set("content-type", contentType);
    }
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: bodyData,
      cache: "no-store",
    });

    const isNoContent = response.status === 204 || response.status === 205 || response.status === 304;
    const responseHeaders = new Headers();
    const responseContentType = response.headers.get("content-type");

    if (!isNoContent && responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    } else if (!isNoContent) {
      responseHeaders.set("content-type", "application/json");
    }

    return new Response(isNoContent ? null : response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Erro no proxy /api/backend:", error);
    return Response.json({ message: "Não foi possível conectar à API." }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;

