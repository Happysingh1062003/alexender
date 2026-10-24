# Alexender

A personal command center, named after Alexander the Great. Plan the day, score it, and keep the mission in sight.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and Zustand. All data stays in your browser (IndexedDB). There are no accounts and no AI APIs.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:3000. On your phone, use "Add to Home Screen" to install it like an app.

## Features

- **Today**: greeting, day-of-year info, a daily quote, tasks with priority and time, a completion ring, Win/Loss status, a 7-day chart, a focus timer, a daily review (mood, win, lesson) and a "Remember" card that brings back a past learning.
- **Calendar**: each day shows its completion %, with a W/L badge. Days you win (at or above your threshold, 70% by default) build a streak. Click a day to plan tasks for it or review it. Insights include streaks, averages, a 6-month heatmap and your best weekdays.
- **Mission**: your mission statement and a vision board. Tap the text to edit it and upload images. Goals have images, milestones and deadlines.
- **Videos**: an ordered YouTube queue. Titles are fetched automatically and videos play inline. When you mark one complete, it asks what you learned, saves that to Learnings and moves the video to Completed.
- **Books**: the same flow, plus covers looked up automatically (Open Library) and a page tracker.
- **Learnings**: everything you learn in one place. Supports #tags, search, filters, and stars (starred items come back on Today).
- **Plans**: an Ideas / In motion / Done board for anything you want to plan or picture. Each plan has a cover, an image board, steps and notes. "Do next step today" adds the next step to today's tasks.
- **Routines**: daily habits added to your day automatically, on the weekdays you choose (Settings).
- **Quick command** (`Ctrl K`, `/` or the + button on mobile):
  - `Gym !high @6pm tomorrow`: a task with priority, time and date
  - `Call mom on fri` · `Read +3d`: schedule ahead
  - `v <youtube link>` · `b Title by Author` · `l a learning #tag` · `g goal` · `p plan`
  - Search across learnings, goals, plans, videos and books
- **Backup**: export or import a JSON file that includes images (Settings).
