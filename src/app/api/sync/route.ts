import type { NextRequest } from "next/server";
import { cloudPart, holdsMoreThanCloud } from "@/lib/cloud";
import { databaseError, signedIn } from "@/lib/server/guard";
import type { Data } from "@/lib/store";

const MAX_BYTES = 4 * 1024 * 1024; // stays under hosting request limits

/** The signed-in person's latest synced data and its version. */
async function handleGET(request: NextRequest) {
  const ctx = await signedIn(request);
  if (ctx instanceof Response) return ctx;
  return Response.json({ storage: ctx.storage.kind, doc: await ctx.storage.getDoc(ctx.viewer.id) });
}

/**
 * Save data that was based on `baseVersion`. If another device saved first, responds 409 with the
 * current copy so the client can merge and try again. `?reset=1` replaces everything instead.
 * Only the cloud part (tasks, day scores, display name) is ever kept — anything else sent by an
 * older version of the app is dropped, and so is anything stored before this rule (photos too).
 */
async function handlePUT(request: NextRequest) {
  const ctx = await signedIn(request);
  if (ctx instanceof Response) return ctx;
  const { storage, viewer } = ctx;

  const text = await request.text();
  if (text.length > MAX_BYTES) return Response.json({ error: "Data too large" }, { status: 413 });
  let body: { data?: unknown; baseVersion?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.data || typeof body.data !== "object") return Response.json({ error: "Missing data" }, { status: 400 });

  const sent = body.data as Partial<Data> & { epoch?: unknown };
  const data = { ...cloudPart(sent), ...(typeof sent.epoch === "string" && { epoch: sent.epoch }) };

  if (request.nextUrl.searchParams.get("reset") === "1") {
    return Response.json({ version: await storage.reset(viewer.id, data) });
  }

  const before = await storage.getDoc(viewer.id);
  const result = await storage.putDoc(viewer.id, data, Number(body.baseVersion) || 0);
  // The first save after the switch to tasks-only also removes photos stored here before.
  if (result.ok && before && holdsMoreThanCloud(before.data as Record<string, unknown>)) await storage.clearImages(viewer.id);
  return result.ok ? Response.json({ version: result.version }) : Response.json({ current: result.current }, { status: 409 });
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
