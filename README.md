# Open Loops

A colour-coded tracker for ongoing projects, learning, follow-ups and ideas, designed around research on attention, goal pursuit and ADHD-friendly task management.

## Use it on your phone

Once GitHub Pages is on, the app lives at **https://guptaankur94.github.io/Tracker/**.

On iPhone: open that link in Safari → Share → **Add to Home Screen**. Always open it from the home-screen icon. iPhone keeps the home-screen app's data separate from Safari's.

## Where your data lives

In this version, tasks are saved **only in the browser on that device**. They don't sync between devices.

- Back up from **Review → Back up your list → Export backup**. That saves one `.json` file.
- **Import backup** loads that file into any copy of the app. It adds and updates items and never deletes anything.
- The app reminds you to back up if it has been more than a week.

## Files

| File | What it is |
|---|---|
| `index.html` | The app GitHub Pages serves (built, don't edit by hand) |
| `src/open-loops.html` | The app source. The same file is published as the Claude artifact |
| `build/build.py` | Turns the source into `index.html`, the icons and the manifest |
| `manifest.webmanifest`, `icon-*.png` | Home-screen name and icon |
| `sw.js` | Lets the home-screen app open without internet (built) |
| `tests/audit.js` | Automated test of every feature in an emulated iPhone (`node tests/audit.js`) |

To rebuild after changing the source: `python3 build/build.py src/open-loops.html`

## Features

- **Now** screen: at most three items matched to your energy level
- Six colour-coded kinds: Deep work, Quick admin, Reading, Hands-on learning, Follow-up, Idea
- Priority A/B/C (capped at three A's), hard vs self-set due dates
- Effort and time estimates, with estimated-vs-actual comparison
- 2-minute starter steps and subtasks for tough items
- Focus timer (default 25 min, adjustable 15–90)
- Inbox for quick capture, weekly Sunday review, export/import backup
- Lingering detection with shrink / schedule / park / drop decisions
- A **Why** tab listing the research behind each rule

## Research basis

Klinger (current concerns), Zeigarnik effect, Masicampo & Baumeister (2011), Gollwitzer & Sheeran (2006), Gawrilow & Gollwitzer (2008), Leroy (2009), Barkley (executive function), Safren et al. (2005, 2010), Sonuga-Barke (2002), Ariely & Wertenbroch (2002), Newport (2016), Allen (2001), Raffiee & Feng (2014).
