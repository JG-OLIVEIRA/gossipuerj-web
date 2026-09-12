import { del, get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

// In-memory fallback map stub per AI Studio migration reference for @vercel/blob
type StoredBlob = {
  buffer: Buffer;
  contentType: string;
  pathname: string;
};

const globalBlobs = globalThis as unknown as {
  __mockBlobStore?: Map<string, StoredBlob>;
};
if (!globalBlobs.__mockBlobStore) {
  globalBlobs.__mockBlobStore = new Map<string, StoredBlob>();
}
const mockBlobStore = globalBlobs.__mockBlobStore;

export async function GET(request: Request): Promise<Response> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const blobUrl = new URL(request.url).searchParams.get("url");

  if (!blobUrl) return Response.json({ error: "URL do Blob ausente." }, { status: 400 });

  // 1. Check in-memory mock store first
  if (mockBlobStore.has(blobUrl)) {
    const item = mockBlobStore.get(blobUrl)!;
    return new Response(new Uint8Array(item.buffer), {
      headers: {
        "Content-Type": item.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // 2. If token is provided and it's a Vercel Blob URL, retrieve from Vercel Blob
  if (token) {
    try {
      const parsedUrl = new URL(blobUrl);
      if (parsedUrl.protocol === "https:" && parsedUrl.hostname.endsWith(".blob.vercel-storage.com")) {
        const result = await get(parsedUrl.toString(), { access: "private", token });
        if (!result || result.statusCode !== 200) return new Response(null, { status: 404 });

        return new Response(result.stream, {
          headers: {
            "Content-Type": result.blob.contentType,
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    } catch (error: unknown) {
      console.error("Erro ao ler foto do Vercel Blob:", error);
    }
  }

  return Response.json({ error: "Foto não encontrada no armazenamento." }, { status: 404 });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { url?: string };
    const blobUrl = body.url ? new URL(body.url) : null;
    if (!blobUrl) {
      return NextResponse.json({ error: "URL do Blob inválida." }, { status: 400 });
    }

    if (mockBlobStore.has(blobUrl.toString())) {
      mockBlobStore.delete(blobUrl.toString());
      return new NextResponse(null, { status: 204 });
    }

    if (token && blobUrl.protocol === "https:" && blobUrl.hostname.endsWith(".blob.vercel-storage.com")) {
      await del(blobUrl.toString(), { token });
      return new NextResponse(null, { status: 204 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("Erro ao apagar foto:", error);
    const message = error instanceof Error ? error.message : "Falha ao apagar arquivo.";
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

    // If real Vercel Blob token is configured, use it
    if (token) {
      try {
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
      } catch (err) {
        console.warn("Vercel Blob put falhou, utilizando fallback in-memory:", err);
      }
    }

    // In-memory Map stub (AI Studio environment fallback)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || "image/jpeg";
    const mockUrl = `https://mock-${Date.now()}.blob.local/${pathname}`;

    mockBlobStore.set(mockUrl, { buffer, contentType, pathname });

    return NextResponse.json({
      url: mockUrl,
      downloadUrl: mockUrl,
      pathname,
      contentType,
    });
  } catch (error: unknown) {
    console.error("Erro no upload:", error);
    const message = error instanceof Error ? error.message : "Falha ao enviar arquivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
