# Alexander

A private, calm command center for one person. Plan the day, see your progress, keep your missions in sight, and remember how much time you have.

Next.js 16 · React 19 · Tailwind CSS 4 · Zustand. Black, minimal, mobile-first. Data is saved on each device and synced across your devices through your own server. No AI APIs.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. On a phone, use "Add to Home Screen".

## Sections

Every section has the same shape: a small label and "+ Add …" button at the top, the content centered below.

- **Today** — a small marble head of Alexander beside today's completion %, then your tasks. A Today / Tomorrow switch lets you plan tomorrow without showing both. Tick a task and its time is added automatically (▶ times it exactly; click the time to correct it). 70% or more is a successful day. Any task can carry a note (the note button beside it; tap the note to edit). Delete and "move to next day" can be undone.
- **Calendar** — analytics only: average, days won, streak and focus time for 7 / 30 / 90 days; a completion line you can scrub with a finger or the mouse; the month grid; your weekly rhythm; focus time per day; and the last six months as a heatmap. Tap any day in a chart to jump to it.
- **Mission** — only your missions and goals, large and centered. Tap one to see its words and every image whole, one below another. Add, edit, reorder and remove images in Settings.
- **Journal** — "Write today" opens a full-screen page that always fits above the phone keyboard, with a back button (the phone's back gesture works too). Saves as you type.
- **Videos** — paste a YouTube link; title, thumbnail, length, views and date fill in. Play, mark watched, see time left.
- **Books** — read several at once: each book in Reading keeps its own page progress; the rest wait in Up next (Start reading / Pause). Covers are found automatically, or tap a cover to use your own photo. Finishing a book asks what action you will take.
- **Stories** — 56 short true stories of courage. Eleven of Alexander (Bucephalus, the Granicus, his doctor's cup, Issus, Tyre, Diogenes, the Gordian knot, Gaugamela, Porus, the Malli wall, the water in the helmet), then great people from India, Europe, Asia, Africa and the Americas — Leonidas, Caesar, Napoleon, Shivaji, Lakshmibai, Genghis Khan, Shackleton, Gandhi, Mandela and more. One simple list, one featured each day. Add your own with **Add story**: who, their photo, the story, and optionally when, the lesson and a source — they sync to every device and can be edited or deleted. Every picture is a real depiction of the person (ancient mosaics, coins, statues, period portraits, photographs from Wikimedia Commons, credited), and every story names its source.
- **Planning** — plan anything: each plan has steps to tick off and free notes.
- **To-do** — things to get done some time, not tied to a day.
- **Podcasts** — episodes to listen to; paste a link (YouTube titles fill in) or type a name.
- **Don't do** — habits to avoid and lines you don't cross.
- **Bucket list** — the life outside work: places, adventures, moments. Add a photo and a note, mark them lived.
- **Life** — days, weeks, months or years left; rings for what is left of today, this week, month, year and your life; a timeline with Alexander's age on it; and a grid that follows the chosen unit (this year day by day, or your whole life in weeks, months or years).
- **Settings** — name, success threshold, missions & goals (with their images), passcode, sync, backup export/import.

Every list — tasks, missions, goals, plans, to-dos, videos, podcasts, books, bucket list, don'ts — can be reordered: drag the ⋮⋮ handle (press and hold on a phone), or focus it and use Enter + arrow keys.

The statue is the marble head of Alexander in the British Museum, cut out from its background into `public/alexander.webp` (51 KB, served locally). Internal storage names still say `alexender`, so existing data and backups keep working.

## Use it on every device (sync)

Every device keeps a local copy (instant, works offline) and syncs in the background through your own server. Edits from different devices are merged record by record, so nothing is overwritten. Photos sync too.

- **On this computer (`npm run dev`)** sync saves to a `.data` folder next to the app (not committed to git).
- **Online** it saves to a free Neon Postgres database. Setup, about 10 minutes:

1. Push this project to GitHub (already set up: `git push`).
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, click **Add New → Project**, and import the `alexender` repository. Don't deploy yet.
3. In **Environment Variables**, add `ALEXANDER_PASSWORD` with a long password only you know. Then click **Deploy**.
4. In the project, open **Storage → Create Database → Neon** (free), and connect it to the project. This adds `DATABASE_URL` automatically.
5. Open **Deployments → ⋯ → Redeploy** so the new database setting takes effect.
6. Open your site on your computer, sign in with your website password, and your data uploads. Then open the same address on your phone, sign in, and use **Add to Home Screen**.

Sync is refused online unless `ALEXANDER_PASSWORD` is set, so your data is never exposed without a password. Settings → *Sync across devices* shows the current status.

Sync turns on by itself once the site has a database and a password — no reload needed. If your sign-in expires, Settings says so and offers **Sign in again**; changes stay on the device meanwhile. Five wrong passwords lock that address out for 10 minutes.

**If two devices show different data:** open Alexander on the device that has the data you want to keep, go to Settings → Sync across devices, and tap **Use this device's data everywhere**. Every other device takes that copy the next time it opens (even one that has never synced). Nothing is lost silently: a replaced device keeps its earlier data, downloadable from Settings → Your data. Both devices must use the same address.

## Privacy

- **Passcode** (Settings → Privacy, or during setup): asked every time the app opens and after 5 minutes in the background. Stored only as a salted hash.
- **Website password**: when you host Alexander online, set `ALEXANDER_PASSWORD` in your host's environment variables (or `.env.local`). The old spelling `ALEXENDER_PASSWORD` still works. Every page then requires it, checked on the server before anything loads.
