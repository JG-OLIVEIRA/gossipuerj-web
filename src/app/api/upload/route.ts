import { del, get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<Response> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const blobUrl = new URL(request.url).searchParams.get("url");

  if (!token) return Response.json({ error: "BLOB_READ_WRITE_TOKEN não configurado." }, { status: 412 });
  if (!blobUrl) return Response.json({ error: "URL do Blob ausente." }, { status: 400 });

  try {
    const parsedUrl = new URL(blobUrl);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".blob.vercel-storage.com")) {
      return Response.json({ error: "URL do Blob inválida." }, { status: 400 });
    }

    const result = await get(parsedUrl.toString(), { access: "private", token });
    if (!result || result.statusCode !== 200) return new Response(null, { status: 404 });

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao ler foto privada do Vercel Blob:", error);
    return Response.json({ error: "Não foi possível carregar a foto." }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  if (!token) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN não configurado." }, { status: 412 });
  }

  try {
    const body = (await request.json()) as { url?: string };
    const blobUrl = body.url ? new URL(body.url) : null;
    if (!blobUrl || blobUrl.protocol !== "https:" || !blobUrl.hostname.endsWith(".blob.vercel-storage.com")) {
      return NextResponse.json({ error: "URL do Blob inválida." }, { status: 400 });
    }

    await del(blobUrl.toString(), { token });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("Erro ao apagar foto do Vercel Blob:", error);
    const message = error instanceof Error ? error.message : "Falha ao apagar arquivo do Vercel Blob.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Nenhum arquivo de imagem válido foi enviado." },
        { status: 400 }
      );
    }

    const originalName = file instanceof File ? file.name : "crush-photo.jpg";
    const extension = originalName.split(".").pop() || "jpg";
    const sanitizedBase = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 30) || "foto";
    
    const pathname = `crushes/${Date.now()}-${sanitizedBase}.${extension}`;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "BLOB_READ_WRITE_TOKEN não configurado. No dashboard da Vercel, acesse Storage > Vercel Blob e conecte ao projeto.",
          missingToken: true,
        },
        { status: 412 }
      );
    }

    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType: file.type || "image/jpeg",
    });

    return NextResponse.json({
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (error: unknown) {
    console.error("Erro no upload do Vercel Blob:", error);
    const message = error instanceof Error ? error.message : "Falha ao enviar arquivo para o Vercel Blob.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
