import type { NextRequest } from "next/server";
import { sitePassword } from "@/lib/auth";
import { databaseError, viewer } from "@/lib/server/guard";
import { getStorage } from "@/lib/server/storage";

/** Who is signed in, and whether this site can have more than one person. */
export async function GET(request: NextRequest) {
  try {
    const storage = getStorage();
    const who = await viewer(request, storage);
    if (!who) return Response.json({ error: "Signed out" }, { status: 401 });
    return Response.json({
      id: who.id,
      role: who.role,
      name: who.account?.name ?? null,
      // Inviting people needs sign-in (a site password) and a shared place to keep accounts.
      accounts: !!sitePassword() && !!storage,
    });
  } catch (error) {
    return databaseError(error);
  }
}
