import type { NextRequest } from "next/server";
import { databaseError, signedIn } from "@/lib/server/guard";

const validId = (id: string | null): id is string => !!id && /^[\w-]{8,64}$/.test(id);

/** A synced photo of the signed-in person. Ids are unique per upload, so responses can be cached forever. */
async function handleGET(request: NextRequest) {
  const ctx = await signedIn(request);
  if (ctx instanceof Response) return ctx;
  const { storage, viewer } = ctx;
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const image = await storage.getImage(viewer.id, id);
  if (!image) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: { "Content-Type": image.type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}

async function handleDELETE(request: NextRequest) {
  const ctx = await signedIn(request);
  if (ctx instanceof Response) return ctx;
  const { storage, viewer } = ctx;
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  await storage.deleteImage(viewer.id, id);
  return Response.json({ ok: true });
}

export async function GET(request: NextRequest) {
  try {
    return await handleGET(request);
  } catch (error) {
    return databaseError(error);
  }
}

/** Photos stay on your devices; the server no longer keeps new ones. */
export async function PUT() {
  return Response.json({ error: "Photos stay on your device." }, { status: 410 });
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleDELETE(request);
  } catch (error) {
    return databaseError(error);
  }
}
