"use client";

import { SimpleList } from "@/components/SimpleList";

/** Things to get done some time — not tied to a day like Today's tasks. */
export default function TodoPage() {
  return (
    <SimpleList
      config={{
        kind: "todos",
        addLabel: "Add to-do",
        placeholder: "Renew passport",
        empty: "Things to get done some time — not tied to a particular day.",
        completable: true,
        completeLabel: "Mark done",
        doneLabel: "Done",
      }}
    />
  );
}
