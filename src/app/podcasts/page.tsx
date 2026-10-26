"use client";

import { SimpleList } from "@/components/SimpleList";

/** Episodes to listen to: paste a link (YouTube titles fill in) or just type a name. */
export default function PodcastsPage() {
  return (
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
  );
}
