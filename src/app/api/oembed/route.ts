import type { NextRequest } from "next/server";

/**
 * Video details without an API key: title and channel from YouTube's public oEmbed endpoint,
 * plus length, views and publish date read from the public watch page when available.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[\w-]{11}$/.test(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;

  const [oembed, extra] = await Promise.all([
    fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? (r.json() as Promise<{ title?: string; author_name?: string }>) : null))
      .catch(() => null),
    fetch(watchUrl, { headers: { "Accept-Language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.text() : ""))
      .then((html) => ({
        durationSec: Number(html.match(/"lengthSeconds":"(\d+)"/)?.[1]) || undefined,
        views: Number(html.match(/"viewCount":"(\d+)"/)?.[1]) || undefined,
        published: html.match(/"publishDate":"(\d{4}-\d{2}-\d{2})/)?.[1],
      }))
      .catch(() => ({})),
  ]);

  if (!oembed) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ title: oembed.title, author: oembed.author_name, ...extra });
}
