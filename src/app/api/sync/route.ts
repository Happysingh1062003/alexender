import type { NextRequest } from "next/server";
import { syncStorage } from "@/lib/server/guard";

const MAX_BYTES = 4 * 1024 * 1024; // stays under hosting request limits

/** The latest synced data and its version. */
export async function GET() {
  const storage = syncStorage();
  if (storage instanceof Response) return storage;
  return Response.json({ storage: storage.kind, doc: await storage.getDoc() });
}

/**
 * Save data that was based on `baseVersion`. If another device saved first, responds 409 with the
 * current copy so the client can merge and try again. `?reset=1` replaces everything instead.
 */
export async function PUT(request: NextRequest) {
  const storage = syncStorage();
  if (storage instanceof Response) return storage;

  const text = await request.text();
  if (text.length > MAX_BYTES) return Response.json({ error: "Data too large" }, { status: 413 });
  let body: { data?: unknown; baseVersion?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.data || typeof body.data !== "object") return Response.json({ error: "Missing data" }, { status: 400 });

  if (request.nextUrl.searchParams.get("reset") === "1") {
    return Response.json({ version: await storage.reset(body.data) });
  }

  // A device on an older version doesn't know newer sections; keep those rather than dropping them.
  const data = body.data as Record<string, unknown>;
  const current = await storage.getDoc();
  if (current) for (const [key, value] of Object.entries(current.data as Record<string, unknown>)) if (!(key in data)) data[key] = value;

  const result = await storage.putDoc(data, Number(body.baseVersion) || 0);
  return result.ok ? Response.json({ version: result.version }) : Response.json({ current: result.current }, { status: 409 });
}
