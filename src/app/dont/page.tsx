"use client";

import { SimpleList } from "@/components/SimpleList";

/** Rules you keep by not doing: habits to avoid, lines you don't cross. */
export default function DontPage() {
  return (
    <SimpleList
      config={{
        kind: "donts",
        addLabel: "Add a don't",
        placeholder: "No phone in the first hour",
        empty: "Habits to avoid and lines you don't cross. Keep them in front of you.",
      }}
    />
  );
}
