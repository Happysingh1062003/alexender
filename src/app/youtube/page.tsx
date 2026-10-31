"use client";

import { SimpleList } from "@/components/SimpleList";
import { Segmented } from "@/components/ui";
import { PlaylistsTab, VideosTab } from "@/components/YouTube";
import { useStore } from "@/lib/store";

type Tab = "videos" | "playlists" | "podcasts";
const TABS: Tab[] = ["videos", "playlists", "podcasts"];
const left = (list: { done?: boolean }[]) => list.filter((x) => !x.done).length;

/** Everything to watch and listen to: single videos, whole playlists, and podcast episodes. */
export default function YouTubePage() {
  const saved = useStore((s) => s.settings.youtubeTab);
  const videos = useStore((s) => left(s.videos));
  const playlists = useStore((s) => left(s.playlists));
  const podcasts = useStore((s) => left(s.podcasts));
  const tab: Tab = TABS.includes(saved as Tab) ? (saved as Tab) : "videos";
  const label = (name: string, n: number) => (n > 0 ? `${name} · ${n}` : name);

  return (
    <div>
      <div className="mx-auto mb-8 flex justify-center">
        <Segmented<Tab>
          value={tab}
          onChange={(youtubeTab) => useStore.getState().updateSettings({ youtubeTab })}
          options={[
            { value: "videos", label: label("Videos", videos) },
            { value: "playlists", label: label("Playlists", playlists) },
            { value: "podcasts", label: label("Podcasts", podcasts) },
          ]}
        />
      </div>

      {tab === "videos" && <VideosTab />}
      {tab === "playlists" && <PlaylistsTab />}
      {tab === "podcasts" && (
        <SimpleList
          config={{
            kind: "podcasts",
            addLabel: "Add podcast",
            placeholder: "Paste a link or type a name",
            empty: "Episodes to listen to. Paste a link — YouTube titles fill in — or just type a name.",
            completable: true,
            completeLabel: "Mark as listened",
            doneLabel: "Listened",
            links: true,
          }}
        />
      )}
    </div>
  );
}
