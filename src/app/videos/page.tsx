"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { DoneRow, DoneSection, QueueRow } from "@/components/Queue";
import { Modal, ProgressBar, SectionTop } from "@/components/ui";
import { addVideoFromUrl, fetchVideoTitle, PENDING_TITLE } from "@/lib/capture";
import { formatShort } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { Video } from "@/lib/types";
import { formatCount, formatDuration, formatMinutes, ytThumb } from "@/lib/utils";

/** "Rick Astley · 1.8B views · 24 Oct 2009" */
const details = (v: Video) =>
  [v.channel, v.views && `${formatCount(v.views)} views`, v.published && `${formatShort(v.published)} ${v.published.slice(0, 4)}`]
    .filter(Boolean)
    .join(" · ");

function Thumb({ video, onPlay }: { video: Video; onPlay?: () => void }) {
  return (
    <button onClick={onPlay} disabled={!onPlay} aria-label={`Play ${video.title}`} className="group/thumb relative shrink-0 overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ytThumb(video.youtubeId)} alt="" className="aspect-video w-28 object-cover" />
      {onPlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover/thumb:opacity-100">
          <Play className="size-5 fill-white text-white" />
        </span>
      )}
      {video.durationSec && (
        <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 font-mono text-[10px] text-white">{formatDuration(video.durationSec)}</span>
      )}
    </button>
  );
}

export default function VideosPage() {
  const videos = useStore((s) => s.videos);
  const { completeVideo, moveVideo, deleteVideo, reopenVideo, updateVideo } = useStore.getState();
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    videos.filter((v) => v.title === PENDING_TITLE).forEach((v) => fetchVideoTitle(v.id));
  }, [videos]);

  const queue = videos.filter((v) => !v.done).sort((a, b) => a.order - b.order);
  const done = videos.filter((v) => v.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const leftMin = queue.reduce((s, v) => s + (v.durationSec ?? 0), 0) / 60;

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        label="Videos"
        actions={[
          {
            label: "Add video",
            placeholder: "Paste a YouTube link",
            keepOpen: true,
            onAdd: (url) => {
              const result = addVideoFromUrl(url);
              setError(result === "invalid" ? "That isn't a YouTube link." : result === "duplicate" ? "That video is already in your list." : "");
            },
          },
        ]}
      />
      {error && <p className="-mt-6 mb-6 text-center text-[12px] text-danger">{error}</p>}

      {videos.length > 0 && (
        <div className="mx-auto mb-10 max-w-[240px] text-center">
          <ProgressBar value={(done.length / videos.length) * 100} />
          <p className="mt-2.5 font-mono text-[12px] text-faint tabular-nums">
            <span className="text-fg">{done.length}</span>/{videos.length} watched{leftMin > 0 && ` · ${formatMinutes(leftMin)} left`}
          </p>
        </div>
      )}

      {videos.length === 0 && <p className="text-center text-[15px] text-faint">Paste a YouTube link — title, thumbnail and length fill in.</p>}
      {videos.length > 0 && queue.length === 0 && <p className="text-center text-[15px] text-faint">All watched.</p>}

      <ul>
        {queue.map((v, i) => (
          <QueueRow
            key={v.id}
            media={<Thumb video={v} onPlay={() => setPlaying(v)} />}
            title={v.title}
            subtitle={details(v)}
            isFirst={i === 0}
            isLast={i === queue.length - 1}
            onMove={(dir) => moveVideo(v.id, dir)}
            onRemove={() => confirm("Remove this video?") && deleteVideo(v.id)}
            onComplete={() => completeVideo(v.id)}
            onRename={(title) => updateVideo(v.id, { title })}
          />
        ))}
      </ul>

      <DoneSection label="Watched" count={done.length}>
        {done.map((v) => (
          <DoneRow key={v.id} media={<Thumb video={v} />} title={v.title} completedAt={v.completedAt} onReopen={() => reopenVideo(v.id)} />
        ))}
      </DoneSection>

      <Modal open={!!playing} onClose={() => setPlaying(null)} title={<span className="line-clamp-1">{playing?.title}</span>} wide>
        {playing && (
          <div className="relative -mx-5 aspect-video bg-black sm:mx-0 sm:overflow-hidden sm:rounded-xl">
            <iframe
              className="absolute inset-0 size-full"
              src={`https://www.youtube-nocookie.com/embed/${playing.youtubeId}?autoplay=1&rel=0`}
              title={playing.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
