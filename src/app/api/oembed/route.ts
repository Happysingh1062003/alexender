import type { NextRequest } from "next/server";

/** Proxies YouTube's public oEmbed endpoint to read a video's title and channel (no API key, no AI). */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[\w-]{11}$/.test(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
  );
  if (!res.ok) return Response.json({ error: "Not found" }, { status: 404 });

  const data = (await res.json()) as { title?: string; author_name?: string };
  return Response.json({ title: data.title, author: data.author_name });
}
