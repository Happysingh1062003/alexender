"use client";

import { Cloud, Download, HardDrive, LockKeyhole, RefreshCw, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { lockNow } from "@/components/AppShell";
import { PasscodeSetup } from "@/components/Lock";
import { MissionsAndGoals } from "@/components/MissionSettings";
import { Button, Card, Input, SectionTitle } from "@/components/ui";
import { exportBackup, importBackup } from "@/lib/backup";
import { clearImages } from "@/lib/images";
import { verifyPasscode } from "@/lib/lock";
import { useClock, useStore } from "@/lib/store";
import { resetEverywhere, syncNow, useSync } from "@/lib/sync";

function useStorageInfo() {
  const [info, setInfo] = useState<{ persisted: boolean; usage: number } | null>(null);
  useEffect(() => {
    Promise.all([navigator.storage?.persisted?.() ?? false, navigator.storage?.estimate?.() ?? {}]).then(([persisted, est]) =>
      setInfo({ persisted, usage: (est as StorageEstimate).usage ?? 0 }),
    );
  }, []);
  return info;
}

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="mx-auto max-w-2xl space-y-4">

      <Card>
        <SectionTitle>Profile</SectionTitle>
        <label className="block">
          <span className="mb-1.5 block text-[12px] text-faint">Your name</span>
          <Input defaultValue={settings.name} onChange={(e) => e.target.value.trim() && updateSettings({ name: e.target.value.trim() })} />
        </label>
        <label className="mt-5 block">
          <span className="mb-2 flex justify-between text-[12px] text-faint">
            A day counts as a success at
            <span className="font-mono text-fg">{settings.winThreshold}%</span>
          </span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={settings.winThreshold}
            onChange={(e) => updateSettings({ winThreshold: Number(e.target.value) })}
            className="w-full accent-[var(--crystal)]"
          />
        </label>
        <p className="mt-3 text-[12px] text-faint">Birth date and country for the Life section are set on the Life page.</p>
      </Card>

      <MissionsAndGoals />
      <SyncCard />
      <Privacy />
      <YourData />
    </div>
  );
}

function Privacy() {
  const lock = useStore((s) => s.settings.lock);
  const updateSettings = useStore((s) => s.updateSettings);
  const [setting, setSetting] = useState(false);
  const [siteLock, setSiteLock] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { enabled: boolean }) => setSiteLock(d.enabled))
      .catch(() => setSiteLock(false));
  }, []);

  const confirmCurrent = () => {
    if (!lock) return true;
    const entered = prompt("Enter your current passcode");
    if (entered === null) return false;
    if (verifyPasscode(entered, lock)) return true;
    alert("That passcode is not right.");
    return false;
  };

  return (
    <Card>
      <SectionTitle>Privacy</SectionTitle>
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">
            Passcode {lock ? <span className="text-success">· On</span> : <span className="text-faint">· Off</span>}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">Asked every time Alexander opens on this device, and after 5 minutes in the background.</p>
          {setting ? (
            <div className="mt-4 max-w-xs">
              <PasscodeSetup onDone={() => setSetting(false)} onCancel={() => setSetting(false)} />
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => confirmCurrent() && setSetting(true)}>
                {lock ? "Change passcode" : "Set passcode"}
              </Button>
              {lock && (
                <>
                  <Button size="sm" variant="outline" onClick={lockNow}>
                    Lock now
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => confirmCurrent() && updateSettings({ lock: undefined })}>
                    Turn off
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-5 text-[13px]">
        <p className="font-medium">
          Website password {siteLock === null ? null : siteLock ? <span className="text-success">· On</span> : <span className="text-faint">· Off</span>}
        </p>
        {siteLock ? (
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-muted">Nobody can open this site without your password.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                window.location.replace("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <p className="mt-1 leading-relaxed text-muted">
            When you put Alexander online, set <code className="rounded bg-surface-3 px-1 font-mono text-[12px] text-fg">ALEXANDER_PASSWORD</code> in your
            host&apos;s environment variables (or in <code className="rounded bg-surface-3 px-1 font-mono text-[12px] text-fg">.env.local</code>) and every page
            will ask for it.
          </p>
        )}
      </div>
    </Card>
  );
}

function SyncCard() {
  const { status, storage, lastSynced, message } = useSync();
  const now = useClock((s) => s.now);
  const on = status !== "off";
  const ago = lastSynced ? Math.max(0, Math.round((now - lastSynced) / 60_000)) : null;
  const line =
    status === "off"
      ? "Off — data stays on this device"
      : status === "offline"
        ? "Offline — changes will sync when you're back online"
        : status === "error"
          ? "Couldn't sync — will retry"
          : status === "syncing" || status === "starting"
            ? "Syncing…"
            : `Synced${ago === null ? "" : ago < 1 ? " just now" : ` ${ago} min ago`}`;

  return (
    <Card>
      <SectionTitle
        action={
          on && (
            <Button size="sm" variant="ghost" onClick={() => syncNow()} disabled={status === "syncing"}>
              <RefreshCw className={status === "syncing" ? "size-3.5 animate-spin" : "size-3.5"} /> Sync now
            </Button>
          )
        }
      >
        Sync across devices
      </SectionTitle>
      <div className="flex items-start gap-3">
        <Cloud className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="text-[13px] leading-relaxed">
          <p className={status === "synced" ? "font-medium text-success" : "font-medium"}>{line}</p>
          <p className="text-muted">
            {on
              ? storage === "cloud"
                ? "Your data is saved in your private cloud database. Open Alexander on any device and sign in with your website password."
                : "Your data is saved on this computer. Devices on the same Wi-Fi can open Alexander at this computer's address."
              : (message ?? "Sync isn't set up on this site.")}
          </p>
        </div>
      </div>
    </Card>
  );
}

function YourData() {
  const storage = useStorageInfo();
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <SectionTitle>Your data</SectionTitle>
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-surface-2 p-3.5">
        <HardDrive className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="text-[13px] leading-relaxed">
          <p className="font-medium">
            {storage?.persisted ? "Saved permanently on this device" : "Saved on this device"}
            {storage && <span className="font-normal text-faint"> · {(storage.usage / 1024 / 1024).toFixed(1)} MB</span>}
          </p>
          <p className="text-muted">A copy is kept on this device so Alexander is instant and works offline. Export a backup any time.</p>
        </div>
      </div>
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
            if (!file || !confirm("Importing replaces all current data on every device. Continue?")) return;
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
          className="sm:ml-auto"
          onClick={async () => {
            if (confirm("Erase all Alexander data on every device? Export a backup first if you want to keep it.")) {
              await clearImages();
              const synced = await resetEverywhere({});
              if (!synced) alert("Erased here, but couldn't reach your other devices. Erase again when you're online.");
            }
          }}
        >
          <Trash2 className="size-4" /> Erase all
        </Button>
      </div>
      {message && <p className="mt-3 text-[12px] font-medium text-success">{message}</p>}
    </Card>
  );
}
