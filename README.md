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

- **Today** — a small marble head of Alexander beside today's completion %, then your tasks. A Today / Tomorrow switch lets you plan tomorrow without showing both. Quick add understands `!high`, `tomorrow`, `on friday` and `+3d`. Each task can carry a note.
- **Habits** — add a habit and tick it the day you do it. Only today can be ticked; a day left unticked counts as not done. Each habit shows the last 7 days, its streak, and (tap it) its best streak, done rate and the last six months day by day.
- **Timer** — type or pick a task, choose when it ends (15 m to 1 h 30 m, or *until* a clock time), and start. It ends on time on any page with a soft chime, shows the countdown in the tab title, and can be stopped early. Today shows time per task; the last week shows how long and on what, day by day. Timed minutes are the focus time in Calendar.
- **Calendar** — analytics only: average, days won, streak and focus time for 7 / 30 / 90 days; a completion line you can scrub with a finger or the mouse; the month grid; your weekly rhythm; focus time per day; and the last six months as a heatmap. Tap any day in a chart to jump to it.
- **Mission** — up to three missions, each with a title, a description and a small icon image, listed as cards. Open one to see its visualization first (your images, whole, one below another) with its plan and progress beside it — or one tap away on a phone.
- **Goals** — concrete targets with a deadline (days left), an icon, a vision and their own plan; mark them achieved.
- **Journal** — "Write today" opens a full-screen page that always fits above the phone keyboard, with a back button (the phone's back gesture works too). Saves as you type.
- **Videos** — paste a YouTube link; title, thumbnail, length, views and date fill in. Play, mark watched, see time left.
- **Books** — read several at once: each book in Reading keeps its own page progress; the rest wait in Up next (Start reading / Pause). Covers are found automatically, or tap a cover to use your own photo. Finishing a book asks what action you will take.
- **Stories** — 56 short true stories of courage. Eleven of Alexander (Bucephalus, the Granicus, his doctor's cup, Issus, Tyre, Diogenes, the Gordian knot, Gaugamela, Porus, the Malli wall, the water in the helmet), then great people from India, Europe, Asia, Africa and the Americas — Leonidas, Caesar, Napoleon, Shivaji, Lakshmibai, Genghis Khan, Shackleton, Gandhi, Mandela and more. One simple list, one featured each day. Add your own with **Add story**: who, their photo, the story, and optionally when, the lesson and a source — they sync to every device and can be edited or deleted. Every picture is a real depiction of the person (ancient mosaics, coins, statues, period portraits, photographs from Wikimedia Commons, credited), and every story names its source.
- **Planning** — simple plans: a status, a priority and a **Complete by** date, then the steps and notes. Steps have due dates, reorder by dragging, show the next step, and go to Today in one tap. Coming up lists dated steps across all plans; active plans sort by status, priority and deadline.
- **Ideas** — capture an idea in one line, research it (notes), then **Accept** or **Reject** it with the reason. Open, Accepted and Rejected lists; reopen any decision.
- **Podcasts** — episodes to listen to; paste a link (YouTube titles fill in) or type a name.
- **Don't do** — habits to avoid and lines you don't cross.
- **Bucket list** — the life outside work: places, adventures, moments. Add a photo and a note, mark them lived.
- **Life** — weeks left, how much of your life has passed, what's left of today, this week, month and year, and one picture: your life in weeks or this year day by day.
- **Settings** — name, success threshold, passcode, sync, backup export/import.

Missions, Goals, Planning, Ideas, Journal and Stories each show their own progress at the top. On a phone, the four main sections sit in the bottom bar and the glowing orb opens every other section.

Tasks, habits, missions, goals, plan steps, videos, podcasts, books, the bucket list and don'ts can be reordered: drag the ⋮⋮ handle (press and hold on a phone), or focus it and use Enter + arrow keys.

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
