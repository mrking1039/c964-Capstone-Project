# Kick Daily Sub Counter — OBS Overlay + Control Panel

A daily gifted-sub counter for your Kick channel that shows up in OBS as
**`Daily Subs : 0 / 5`**, and a browser **control panel** where you can bump the
count or change the goal by hand from your laptop or phone. Live gifted subs are
counted automatically; manual edits and the goal sync everywhere in real time
through your own free Firebase database.

Built for [`boyking`](https://kick.com/boyking) but works for any channel.

| Page | File | Use it for |
| ---- | ---- | ---------- |
| **Overlay** | `index.html` | The browser source you add to OBS |
| **Control panel** | `control.html` | Adjusting the count / goal by hand |

- The **overlay** listens to Kick's public real-time chat socket and adds every
  gifted sub to the count automatically.
- The **control panel** lets you set the count (the “0”) and the goal (the “5”)
  manually, with `+1 / −1 / +5 / Reset` buttons and “set exact value” fields.
- Both pages share one number via **Firebase**, so a change in either place shows
  up instantly in the other and in OBS — even across different devices.
- **Resets to 0 automatically at local midnight.**

---

## Setup overview

1. **One-time:** create a free Firebase Realtime Database and paste its config
   into `firebase-config.js`.
2. Publish the pages (GitHub Pages) to get URLs.
3. Add the **overlay** URL to OBS as a Browser Source.
4. Open the **control panel** URL on your laptop/phone to adjust things live.

> Not ready for Firebase yet? Leave `firebase-config.js` blank and everything
> still runs in **local mode** (single browser) so you can test the layout and
> buttons. You just won't get cross-device / OBS syncing until Firebase is set.

---

## 1. Firebase setup (one time, ~5 minutes)

1. Go to <https://console.firebase.google.com> and **Add project** (any name,
   you can disable Google Analytics).
2. In the left menu: **Build → Realtime Database → Create Database**.
   - Pick any location.
   - Choose **Start in test mode** (or use the rules below), then **Enable**.
3. Recommended database **Rules** (Realtime Database → Rules tab) — this locks
   writes to just the counter path:
   ```json
   {
     "rules": {
       "kickDailySubs": { ".read": true, ".write": true }
     }
   }
   ```
   Click **Publish**. (This lets anyone with the exact URL read/write the
   counter — fine for a stream counter. You can tighten it later.)
4. Click the **gear icon → Project settings → Your apps → Web `</>`**, register
   an app (nickname anything), and copy the `firebaseConfig` values.
5. Open **`firebase-config.js`** in this repo and paste your values:
   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project",
     appId: "1:...:web:..."
   };
   ```
   `apiKey` and `databaseURL` are the two that matter. Commit/push the change (or
   re-upload the file to your host).

---

## 2. Publish the pages (get your URLs)

Hosting uses **GitHub Pages**, which needs the repo to be **public** (free plan).
A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) does the rest —
it self-enables Pages and publishes on every push.

1. Repo → **Settings → General → Danger Zone → Change repository visibility →
   Make public** → confirm.
2. The next push publishes automatically. (Editing `firebase-config.js` in
   step 1 above is a push, so that alone triggers it. To publish without any new
   commit, go to the **Actions** tab → **Deploy to GitHub Pages** → **Run
   workflow** on branch `claude/kick-gifted-sub-counter-rtxo2s`.)
3. After the run goes green (~1 min), your URLs are:
   - **Overlay:** `https://mrking1039.github.io/c964-Capstone-Project/`
   - **Control panel:** `https://mrking1039.github.io/c964-Capstone-Project/control.html`

Both default to channel `boyking`. Add `?channel=yourname` to use another channel.

---

## 3. Add the overlay to OBS

1. **Sources → + → Browser**, name it `Daily Subs`.
2. **URL:** your overlay link (`…github.io/c964-Capstone-Project/`).
3. **Width** `500`, **Height** `220` (adjust to taste).
4. Uncheck **“Shutdown source when not visible”** so it keeps counting.
5. **OK**, then position it on your scene.

Refresh after changes: right-click the source → **Properties → Refresh cache of
current page**.

---

## 4. Use the control panel

Open the control panel URL in any browser (phone included). You'll see the live
`Daily Subs : X / Y` and can:

- **Count (the “0”):** `−1`, `+1`, `+5`, `Reset 0`, or type an exact value → **Set**.
- **Goal (the “5”):** `−1`, `+1`, `+5`, or type an exact value → **Set**.
- **Switch channel** without editing URLs.

Every change appears in OBS within a moment. Live gifted subs keep adding on top
automatically while OBS is open.

---

## Overlay styling options (URL settings)

Append to the overlay URL as `?name=value` joined with `&`:

| Setting     | Does                                       | Example                |
| ----------- | ------------------------------------------ | ---------------------- |
| `channel`   | Kick channel slug (default `boyking`)      | `?channel=boyking`     |
| `label`     | Text before the numbers (`label=` to hide) | `&label=Daily%20Subs`  |
| `color`     | Accent / count / bar color                 | `&color=%23ffd54a`     |
| `size`      | Font size for the label and numbers        | `&size=90px`           |
| `chatroom_id` | Manual Kick chatroom id (troubleshooting)| `&chatroom_id=123456`  |

Example:
```
https://mrking1039.github.io/c964-Capstone-Project/?label=Daily%20Subs&color=%2353fc18&size=90px
```

---

## How things work

- **Live counting:** only the **overlay** connects to Kick's socket and writes
  gifted-sub increments (via an atomic Firebase update), so the count is never
  double-added. Run a single overlay source for an accurate total.
- **Daily reset:** the shared record is tagged with today's local date. On load
  and every 30 seconds, if the date has changed the count resets to `0` (the goal
  is kept). So it survives OBS restarts during the day and starts fresh at your
  computer's local midnight.
- **What counts:** Kick's `GiftedSubscriptionsEvent`; a “gift 5 subs” action adds
  5. Regular self-subs/resubs are not counted.

---

## Troubleshooting

- **Overlay says “Local mode”/panel shows Local:** `firebase-config.js` isn't
  filled in (or the file didn't get published). Add your config and refresh.
- **“Firebase error … check database rules”:** publish the Rules from step 1.3.
- **“Can't find chatroom for …”:** Kick's channel lookup is occasionally blocked
  by Cloudflare. Open `https://kick.com/api/v2/channels/boyking`, find
  `"chatroom": { "id": 123456 }`, and add `&chatroom_id=123456` to the overlay URL.
- **Number doesn't go up on a real gift:** confirm the channel slug, that OBS
  (the overlay) is actually running, and that it was a *gifted* sub.
- **Bottom-left status pill** on the overlay only appears when something needs
  attention; a healthy overlay shows just the numbers.
