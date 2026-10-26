import type { NextRequest } from "next/server";
import { databaseError, syncStorage } from "@/lib/server/guard";

const MAX_BYTES = 4 * 1024 * 1024;

const validId = (id: string | null): id is string => !!id && /^[\w-]{8,64}$/.test(id);

/** A synced photo. Ids are unique per upload, so responses can be cached forever. */
async function handleGET(request: NextRequest) {
  const storage = syncStorage();
  if (storage instanceof Response) return storage;
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const image = await storage.getImage(id);
  if (!image) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: { "Content-Type": image.type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}

async function handlePUT(request: NextRequest) {
  const storage = syncStorage();
  if (storage instanceof Response) return storage;
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const type = request.headers.get("content-type") ?? "application/octet-stream";
  if (!type.startsWith("image/") && type !== "application/octet-stream") return Response.json({ error: "Not an image" }, { status: 415 });
  const bytes = Buffer.from(await request.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return Response.json({ error: "Bad size" }, { status: 413 });

  await storage.putImage(id, bytes, type);
  return Response.json({ ok: true });
}

async function handleDELETE(request: NextRequest) {
  const storage = syncStorage();
  if (storage instanceof Response) return storage;
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  await storage.deleteImage(id);
  return Response.json({ ok: true });
}

export async function GET(request: NextRequest) {
  try {
    return await handleGET(request);
  } catch (error) {
    return databaseError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await handlePUT(request);
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleDELETE(request);
  } catch (error) {
    return databaseError(error);
  }
}
