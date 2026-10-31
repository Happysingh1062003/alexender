"use client";

import { ExternalLink, ListVideo, Play } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DoneRow, DoneSection, QueueRow } from "@/components/Queue";
import { SortableList } from "@/components/Sortable";
import { Modal, ProgressBar, SectionTop, toast } from "@/components/ui";
import { addPlaylistFromUrl, addVideoFromUrl, fetchPlaylistTitle, fetchVideoTitle, PENDING_TITLE } from "@/lib/capture";
import { formatShort } from "@/lib/date";
import { byOrder, useStore } from "@/lib/store";
import type { Playlist, Video } from "@/lib/types";
import { formatCount, formatDuration, formatMinutes, ytThumb } from "@/lib/utils";

/** "Rick Astley · 1.8B views · 24 Oct 2009" */
const details = (v: Video) =>
  [v.channel, v.views && `${formatCount(v.views)} views`, v.published && `${formatShort(v.published)} ${v.published.slice(0, 4)}`]
    .filter(Boolean)
    .join(" · ");

/** A video or a whole playlist, playing in a sheet. */
function Player({ playing, onClose }: { playing: { title: string; src: string; link: string } | null; onClose: () => void }) {
  return (
    <Modal open={!!playing} onClose={onClose} title={<span className="line-clamp-1">{playing?.title}</span>} wide>
      {playing && (
        <>
          <div className="relative -mx-5 aspect-video bg-black sm:mx-0 sm:overflow-hidden sm:rounded-xl">
            <iframe
              className="absolute inset-0 size-full"
              src={playing.src}
              title={playing.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <a href={playing.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-fg">
            Open on YouTube <ExternalLink className="size-3" />
          </a>
        </>
      )}
    </Modal>
  );
}

function Thumb({ src, label, badge, onPlay }: { src?: string; label: string; badge?: ReactNode; onPlay?: () => void }) {
  return (
    <button onClick={onPlay} disabled={!onPlay} aria-label={`Play ${label}`} className="group/thumb relative shrink-0 overflow-hidden rounded-lg bg-surface-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="aspect-video w-24 object-cover sm:w-28" />
      ) : (
        <span className="flex aspect-video w-24 items-center justify-center text-faint sm:w-28">
          <ListVideo className="size-5" strokeWidth={1.5} />
        </span>
      )}
      {onPlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover/thumb:opacity-100">
          <Play className="size-5 fill-white text-white" />
        </span>
      )}
      {badge && <span className="absolute right-1 bottom-1 flex items-center gap-0.5 rounded bg-black/80 px-1 font-mono text-[10px] text-white">{badge}</span>}
    </button>
  );
}

const VideoThumb = ({ video, onPlay }: { video: Video; onPlay?: () => void }) => (
  <Thumb src={ytThumb(video.youtubeId)} label={video.title} badge={video.durationSec && formatDuration(video.durationSec)} onPlay={onPlay} />
);

const PlaylistThumb = ({ playlist, onPlay }: { playlist: Playlist; onPlay?: () => void }) => (
  <Thumb src={playlist.thumb} label={playlist.title} badge={<ListVideo className="size-3" />} onPlay={onPlay} />
);

/** Videos to watch, in order. */
export function VideosTab() {
  const videos = useStore((s) => s.videos);
  const { completeVideo, deleteVideo, reopenVideo, updateVideo, reorder, restore } = useStore.getState();
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    videos.filter((v) => v.title === PENDING_TITLE).forEach((v) => fetchVideoTitle(v.id));
  }, [videos]);

  const queue = videos.filter((v) => !v.done).sort(byOrder);
  const done = videos.filter((v) => v.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const leftMin = queue.reduce((s, v) => s + (v.durationSec ?? 0), 0) / 60;

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
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
          <ProgressBar value={(done.length / videos.length) * 100} tone="crystal" />
          <p className="mt-2.5 font-mono text-[12px] text-faint tabular-nums">
            <span className="text-fg">{done.length}</span>/{videos.length} watched{leftMin > 0 && ` · ${formatMinutes(leftMin)} left`}
          </p>
        </div>
      )}

      {videos.length === 0 && <p className="text-center text-[15px] text-faint">Paste a YouTube link — title, thumbnail and length fill in.</p>}
      {videos.length > 0 && queue.length === 0 && <p className="text-center text-[15px] text-faint">All watched.</p>}

      <SortableList items={queue} onReorder={(ids) => reorder("videos", ids)}>
        {(v, handle) => (
          <QueueRow
            handle={handle}
            media={<VideoThumb video={v} onPlay={() => setPlaying(v)} />}
            title={v.title}
            subtitle={details(v)}
            onRemove={() => {
              deleteVideo(v.id);
              toast("Video removed", { label: "Undo", run: () => restore("videos", v) });
            }}
            onComplete={() => completeVideo(v.id)}
            completeLabel="Mark as watched"
            onRename={(title) => updateVideo(v.id, { title })}
          />
        )}
      </SortableList>

      <DoneSection label="Watched" count={done.length}>
        {done.map((v) => (
          <DoneRow key={v.id} media={<VideoThumb video={v} />} title={v.title} completedAt={v.completedAt} onReopen={() => reopenVideo(v.id)} />
        ))}
      </DoneSection>

      <Player
        playing={playing && { title: playing.title, src: `https://www.youtube-nocookie.com/embed/${playing.youtubeId}?autoplay=1&rel=0`, link: `https://www.youtube.com/watch?v=${playing.youtubeId}` }}
        onClose={() => setPlaying(null)}
      />
    </div>
  );
}

/** Whole playlists — courses, series, albums — to work through. */
export function PlaylistsTab() {
  const playlists = useStore((s) => s.playlists);
  const { togglePlaylist, deletePlaylist, updatePlaylist, reorder, restore } = useStore.getState();
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<Playlist | null>(null);

  useEffect(() => {
    playlists.filter((p) => p.title === PENDING_TITLE).forEach((p) => fetchPlaylistTitle(p.id));
  }, [playlists]);

  const queue = playlists.filter((p) => !p.done).sort(byOrder);
  const done = playlists.filter((p) => p.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        actions={[
          {
            label: "Add playlist",
            placeholder: "Paste a YouTube playlist link",
            keepOpen: true,
            onAdd: (url) => {
              const result = addPlaylistFromUrl(url);
              setError(result === "invalid" ? "That isn't a playlist link — it needs list= in it." : result === "duplicate" ? "That playlist is already in your list." : "");
            },
          },
        ]}
      />
      {error && <p className="-mt-6 mb-6 text-center text-[12px] text-danger">{error}</p>}

      {playlists.length > 0 && (
        <div className="mx-auto mb-10 max-w-[240px] text-center">
          <ProgressBar value={(done.length / playlists.length) * 100} tone="crystal" />
          <p className="mt-2.5 font-mono text-[12px] text-faint tabular-nums">
            <span className="text-fg">{done.length}</span>/{playlists.length} finished
          </p>
        </div>
      )}

      {playlists.length === 0 && <p className="text-center text-[15px] text-faint">Paste a playlist link — a course, a series, an album. Title and cover fill in.</p>}
      {playlists.length > 0 && queue.length === 0 && <p className="text-center text-[15px] text-faint">All finished.</p>}

      <SortableList items={queue} onReorder={(ids) => reorder("playlists", ids)}>
        {(p, handle) => (
          <QueueRow
            handle={handle}
            media={<PlaylistThumb playlist={p} onPlay={() => setPlaying(p)} />}
            title={p.title}
            subtitle={p.channel}
            onRemove={() => {
              deletePlaylist(p.id);
              toast("Playlist removed", { label: "Undo", run: () => restore("playlists", p) });
            }}
            onComplete={() => togglePlaylist(p.id)}
            completeLabel="Mark as finished"
            onRename={(title) => updatePlaylist(p.id, { title })}
          />
        )}
      </SortableList>

      <DoneSection label="Finished" count={done.length}>
        {done.map((p) => (
          <DoneRow key={p.id} media={<PlaylistThumb playlist={p} />} title={p.title} completedAt={p.completedAt} onReopen={() => togglePlaylist(p.id)} />
        ))}
      </DoneSection>

      <Player
        playing={playing && { title: playing.title, src: `https://www.youtube-nocookie.com/embed/videoseries?list=${playing.listId}&autoplay=1&rel=0`, link: `https://www.youtube.com/playlist?list=${playing.listId}` }}
        onClose={() => setPlaying(null)}
      />
    </div>
  );
}
