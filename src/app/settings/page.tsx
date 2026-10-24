"use client";

import { Bell, Download, Repeat, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Card, IconButton, Input, PageHeader, SectionTitle, Segmented } from "@/components/ui";
import { exportBackup, importBackup } from "@/lib/backup";
import { formatTime12, WEEKDAYS } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { Priority, Theme } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [message, setMessage] = useState("");
  const [notif, setNotif] = useState(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="animate-rise space-y-6">
      <PageHeader title="Settings" subtitle="Tune Alexender to the way you fight." />

      <Card>
        <SectionTitle>Profile</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Your name</span>
            <Input defaultValue={settings.name} onBlur={(e) => e.target.value.trim() && updateSettings({ name: e.target.value.trim() })} />
          </label>
          <div>
            <span className="mb-1.5 block text-xs text-muted">Theme</span>
            <Segmented<Theme>
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Scoring & focus</SectionTitle>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs text-muted">
            A day counts as a win at <span className="font-semibold text-fg">{settings.winThreshold}%</span>
          </span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={settings.winThreshold}
            onChange={(e) => updateSettings({ winThreshold: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Focus minutes</span>
            <Input
              type="number"
              min={1}
              max={180}
              value={settings.focusMinutes}
              onChange={(e) => updateSettings({ focusMinutes: Math.max(1, Number(e.target.value) || 25) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Break minutes</span>
            <Input
              type="number"
              min={1}
              max={60}
              value={settings.breakMinutes}
              onChange={(e) => updateSettings({ breakMinutes: Math.max(1, Number(e.target.value) || 5) })}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
          <span className="text-xs text-muted">
            {notif === "granted" ? "Notifications on — you'll be alerted when a focus session ends." : "Get alerted when a focus session ends."}
          </span>
          {notif !== "granted" && notif !== "unsupported" && (
            <Button size="sm" variant="outline" onClick={async () => setNotif(await Notification.requestPermission())}>
              <Bell className="size-3.5" /> Enable
            </Button>
          )}
        </div>
      </Card>

      <Routines />

      <Card>
        <SectionTitle>Your data</SectionTitle>
        <p className="mb-4 text-sm text-muted">
          Everything lives privately in this browser — no account, no cloud, no AI. Export a backup regularly, and import it to move to another device.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await exportBackup();
              setMessage("Backup downloaded.");
            }}
          >
            <Download className="size-4" /> Export backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file || !confirm("Importing replaces all current data. Continue?")) return;
              try {
                await importBackup(file);
                setMessage("Backup restored.");
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Import failed.");
              }
            }}
          />
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Erase all Alexender data on this device? Export a backup first if you want to keep it.")) {
                useStore.getState().replaceAll({});
              }
            }}
          >
            <Trash2 className="size-4" /> Erase everything
          </Button>
        </div>
        {message && <p className="mt-3 text-xs font-medium text-accent">{message}</p>}
      </Card>

      <Card>
        <SectionTitle>Shortcuts</SectionTitle>
        <ul className="space-y-1.5 text-sm text-muted">
          <li><kbd className="font-mono text-fg">Ctrl K</kbd> or <kbd className="font-mono text-fg">/</kbd> — open quick command</li>
          <li><code className="text-fg">Gym !high @6pm tomorrow</code> — task with priority, time, date</li>
          <li><code className="text-fg">on fri</code> · <code className="text-fg">+3d</code> — schedule ahead</li>
          <li><code className="text-fg">v</code> link · <code className="text-fg">b</code> title by author · <code className="text-fg">l</code> learning · <code className="text-fg">g</code> goal · <code className="text-fg">p</code> plan</li>
        </ul>
      </Card>
    </div>
  );
}

function Routines() {
  const routines = useStore((s) => s.routines);
  const { addRoutine, updateRoutine, deleteRoutine } = useStore.getState();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);

  return (
    <Card>
      <SectionTitle>
        <span className="flex items-center gap-1.5">
          <Repeat className="size-3.5 text-accent" /> Daily routines
        </span>
      </SectionTitle>
      <p className="mb-4 text-sm text-muted">Habits added to your day automatically — on the days you choose.</p>

      <div className="mb-4 space-y-2">
        {routines.map((r) => (
          <div key={r.id} className={cn("flex items-center gap-3 rounded-xl border border-line p-3", !r.active && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.title}</p>
              <div className="mt-1.5 flex gap-1">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() =>
                      updateRoutine(r.id, { days: r.days.includes(i) ? r.days.filter((x) => x !== i) : [...r.days, i].sort() })
                    }
                    className={cn(
                      "size-6 rounded-full text-[10px] font-medium",
                      r.days.includes(i) ? "bg-fg text-bg" : "bg-surface-2 text-muted",
                    )}
                  >
                    {d[0]}
                  </button>
                ))}
                {r.time && <span className="ml-2 self-center text-[11px] text-muted">{formatTime12(r.time)}</span>}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => updateRoutine(r.id, { active: !r.active })}>
              {r.active ? "Pause" : "Resume"}
            </Button>
            <IconButton label="Delete routine" className="hover:text-danger" onClick={() => deleteRoutine(r.id)}>
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        ))}
      </div>

      <form
        className="space-y-3 rounded-xl bg-surface-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !days.length) return;
          addRoutine({ title: title.trim(), priority, time: time || undefined, days });
          setTitle("");
          setTime("");
        }}
      >
        <div className="flex gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Workout, Read 20 pages, Meditate" />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32 shrink-0" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {WEEKDAYS.map((d, i) => (
              <button
                type="button"
                key={d}
                onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}
                className={cn("size-7 rounded-full text-[11px] font-medium", days.includes(i) ? "bg-fg text-bg" : "bg-surface text-muted")}
              >
                {d[0]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Segmented<Priority>
              value={priority}
              onChange={setPriority}
              options={[
                { value: "high", label: "High" },
                { value: "med", label: "Med" },
                { value: "low", label: "Low" },
              ]}
            />
            <Button size="sm" disabled={!title.trim() || !days.length}>
              Add
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
