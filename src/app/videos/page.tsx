"use client";

import { ArrowDown, ArrowUp, Check, Lightbulb, Play, RotateCcw, SquarePlay, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LearnModal } from "@/components/LearnModal";
import { Button, Card, Empty, IconButton, Input, PageHeader, Segmented } from "@/components/ui";
import { addVideoFromUrl, fetchVideoTitle, PENDING_TITLE } from "@/lib/capture";
import { formatShort, toKey } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { Video } from "@/lib/types";
import { cn, ytThumb } from "@/lib/utils";

export default function VideosPage() {
  const videos = useStore((s) => s.videos);
  const learnings = useStore((s) => s.learnings);
  const completeVideo = useStore((s) => s.completeVideo);
  const [tab, setTab] = useState<"queue" | "done">("queue");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Video | null>(null);

  useEffect(() => {
    videos.filter((v) => v.title === PENDING_TITLE).forEach((v) => fetchVideoTitle(v.id));
  }, [videos]);

  const queue = videos.filter((v) => !v.done).sort((a, b) => a.order - b.order);
  const done = videos.filter((v) => v.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const total = videos.length;

  return (
    <div className="animate-rise">
      <PageHeader
        title="Videos"
        subtitle={total ? `${done.length} of ${total} watched — learn in sequence.` : "Your curriculum, one video at a time."}
      />

      <form
        className="mb-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim()) return;
          const ok = addVideoFromUrl(url);
          setError(ok ? "" : "That doesn't look like a YouTube link.");
          if (ok) {
            setUrl("");
            setTab("queue");
          }
        }}
      >
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a YouTube link…" inputMode="url" />
        <Button disabled={!url.trim()}>Add</Button>
      </form>
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {total > 0 && (
        <div className="mt-4 mb-4 flex items-center justify-between gap-3">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "queue", label: `Up next · ${queue.length}` },
              { value: "done", label: `Completed · ${done.length}` },
            ]}
          />
          <div className="hidden w-40 sm:block">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-accent" style={{ width: `${(done.length / total) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {tab === "queue" &&
        (queue.length === 0 ? (
          <Empty
            icon={<SquarePlay className="size-5" />}
            title={total ? "Queue cleared. Well done." : "No videos yet"}
            hint="Paste YouTube links in the order you want to learn them."
          />
        ) : (
          <div className="space-y-3">
            {queue.map((v, i) => (
              <Card key={v.id} className={cn("p-3 sm:p-3", i === 0 && "border-accent/40")}>
                {playing === v.id && (
                  <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-black">
                    <iframe
                      className="absolute inset-0 size-full"
                      src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}?autoplay=1&rel=0`}
                      title={v.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center font-mono text-xs text-muted">{i + 1}</span>
                  <button onClick={() => setPlaying(playing === v.id ? null : v.id)} className="relative shrink-0 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ytThumb(v.youtubeId)} alt="" className="aspect-video w-24 object-cover sm:w-32" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                      {playing === v.id ? <X className="size-5" /> : <Play className="size-5 fill-white" />}
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    {i === 0 && <p className="text-[10px] font-semibold tracking-wider text-accent uppercase">Up next</p>}
                    <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
                    {v.channel && <p className="truncate text-xs text-muted">{v.channel}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5 sm:flex-row">
                    <div className="flex">
                      <IconButton label="Move up" disabled={i === 0} onClick={() => useStore.getState().moveVideo(v.id, -1)}>
                        <ArrowUp className="size-3.5" />
                      </IconButton>
                      <IconButton label="Move down" disabled={i === queue.length - 1} onClick={() => useStore.getState().moveVideo(v.id, 1)}>
                        <ArrowDown className="size-3.5" />
                      </IconButton>
                    </div>
                    <div className="flex">
                      <IconButton label="Delete" className="hover:text-danger" onClick={() => confirm("Remove this video?") && useStore.getState().deleteVideo(v.id)}>
                        <Trash2 className="size-3.5" />
                      </IconButton>
                      <IconButton label="Mark complete" className="text-accent hover:text-accent" onClick={() => setCompleting(v)}>
                        <Check className="size-4" strokeWidth={2.5} />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "done" &&
        (done.length === 0 ? (
          <Empty icon={<Check className="size-5" />} title="Nothing completed yet" hint="Finish a video and capture what you learned." />
        ) : (
          <div className="space-y-3">
            {done.map((v) => {
              const learning = learnings.find((l) => l.id === v.learningId);
              return (
                <Card key={v.id} className="p-3 sm:p-3">
                  <div className="flex items-start gap-3">
                    <a href={v.url} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ytThumb(v.youtubeId)} alt="" className="aspect-video w-24 rounded-lg object-cover opacity-80" />
                    </a>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
                      <p className="text-xs text-muted">Completed {v.completedAt && formatShort(toKey(new Date(v.completedAt)))}</p>
                      {learning && (
                        <p className="mt-2 flex gap-1.5 rounded-lg bg-accent-soft/60 p-2 text-xs leading-relaxed">
                          <Lightbulb className="mt-0.5 size-3 shrink-0 text-accent" />
                          {learning.text}
                        </p>
                      )}
                    </div>
                    <IconButton label="Move back to queue" onClick={() => useStore.getState().reopenVideo(v.id)}>
                      <RotateCcw className="size-3.5" />
                    </IconButton>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      <LearnModal
        open={!!completing}
        title={completing?.title ?? ""}
        onClose={() => setCompleting(null)}
        onComplete={(learning) => {
          if (completing) completeVideo(completing.id, learning);
          if (playing === completing?.id) setPlaying(null);
          setCompleting(null);
        }}
      />
    </div>
  );
}
