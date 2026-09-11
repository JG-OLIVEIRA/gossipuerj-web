import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

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

    // Se o token da Vercel Blob não estiver configurado (ex: dev local sem Vercel Blob Store conectada)
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

    // Upload seguro para o Vercel Blob
    const blob = await put(pathname, file, {
      access: "public",
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
