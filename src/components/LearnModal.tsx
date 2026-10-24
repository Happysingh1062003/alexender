"use client";

import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { Button, Modal, Textarea } from "./ui";

/** Asked when finishing a video or book: capture what was learned so it flows into Learnings. */
export function LearnModal({
  open,
  title,
  onClose,
  onComplete,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onComplete: (learning: string) => void;
}) {
  const [text, setText] = useState("");
  const finish = (learning: string) => {
    onComplete(learning);
    setText("");
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Lightbulb className="size-4 text-accent" /> What did you learn?
        </span>
      }
    >
      <p className="mb-3 line-clamp-2 text-sm text-muted">{title}</p>
      <Textarea
        autoFocus
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="The key idea, in your own words. Use #tags to organise."
      />
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={() => finish("")}>
          Skip
        </Button>
        <Button className="flex-1" disabled={!text.trim()} onClick={() => finish(text)}>
          Save & complete
        </Button>
      </div>
    </Modal>
  );
}
