# Alexender

A private, calm command center for one person. Plan the day, see your progress, keep your missions in sight, and remember how much time you have.

Next.js 16 · React 19 · Tailwind CSS 4 · Zustand. Black, minimal, mobile-first. Data is saved automatically in the browser (IndexedDB). No accounts, no AI APIs.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. On a phone, use "Add to Home Screen".

## Sections

Every section has the same shape: a small label and "+ Add …" button at the top, the content centered below.

- **Today** — today's tasks, completion % and time spent. A Today / Tomorrow switch at the top lets you plan tomorrow without showing both. Tick a task and its time is added automatically (▶ times it exactly; click the time to correct it). 70% or more is a successful day.
- **Calendar** — month grid with each day's %, the selected day's tasks, and three numbers for the last 30 days.
- **Mission** — only your missions and goals, large and centered. Tap one to open its images and upload more. Add or delete them in Settings.
- **Journal** — "Write today" at the top, past entries below by date. Saves as you type.
- **Videos** — paste a YouTube link; title, thumbnail, length, views and date fill in. Play, mark watched, see time left.
- **Books** — reading list with page progress on the current book, and finished books. Covers are found automatically.
- **Life** — days left from your birth date and your country's average life expectancy, with your life in weeks. Today shows a one-line reminder.
- **Settings** — name, success threshold, missions & goals, passcode, backup export/import.

## Privacy

- **Passcode** (Settings → Privacy, or during setup): asked every time the app opens and after 5 minutes in the background. Stored only as a salted hash.
- **Website password**: when you host Alexender online, set `ALEXENDER_PASSWORD` in your host's environment variables (or `.env.local`). Every page then requires it, checked on the server before anything loads.
