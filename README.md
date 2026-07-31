# Kick Daily Gifted Sub Counter (OBS Widget)

A lightweight browser overlay that shows how many **gifted subs** your Kick
channel has received **today**, and adds itself to OBS Studio as a **Browser
Source** via a URL. Built for the channel [`boyking`](https://kick.com/boyking)
but works for any Kick channel.

- **No account, API key, or login required.** It listens to Kick's public
  real‑time chat socket (the same one the website uses).
- **Resets automatically at local midnight** and keeps the count if OBS restarts
  during the day.
- **Transparent background** so it drops straight onto your scene.

---

## 1. Get the widget link

The widget is a single `index.html` file. The easiest free way to get a URL for
OBS is **GitHub Pages** (this repo is already on GitHub):

1. Go to your repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Set **Branch** to `claude/kick-gifted-sub-counter-rtxo2s` (or merge to `main`
   and pick `main`) and folder **`/ (root)`**, then **Save**.
4. Wait ~1 minute. GitHub shows your published URL, which will look like:

   ```
   https://mrking1039.github.io/c964-capstone-project/
   ```

That published URL **is** your widget link. Because the channel defaults to
`boyking`, the base URL already works. To be explicit you can use:

```
https://mrking1039.github.io/c964-capstone-project/?channel=boyking
```

> Prefer not to use GitHub Pages? You can also drop the raw `index.html` on any
> static host (Netlify, Cloudflare Pages, your own web server) and use that URL.

---

## 2. Add it to OBS Studio

1. In OBS, under **Sources**, click **+** → **Browser**.
2. Name it e.g. `Gifted Subs Today` → **OK**.
3. Paste your widget link into **URL**.
4. Set **Width** `400` and **Height** `200` (adjust to taste).
5. Make sure **"Shutdown source when not visible"** is **unchecked** so the count
   keeps running.
6. Click **OK**, then drag/resize it where you want on your scene.

To refresh after changing settings: right‑click the source → **Properties** →
**Refresh cache of current page**, or tick **Refresh browser when scene becomes
active**.

---

## 3. Customize (optional URL settings)

Add these to the end of the URL as `?name=value`, joined with `&`:

| Setting        | What it does                                        | Example                     |
| -------------- | --------------------------------------------------- | --------------------------- |
| `channel`      | Kick channel slug (default `boyking`)               | `?channel=boyking`          |
| `label`        | Text above the number (empty `label=` to hide)      | `&label=Gifts%20Today`      |
| `color`        | Number color (hex/name)                              | `&color=%2353fc18`          |
| `size`         | Number font size                                     | `&size=120px`               |
| `labelsize`    | Label font size                                      | `&labelsize=26px`           |
| `reset`        | `daily` (default), `session`, or `never`            | `&reset=daily`              |
| `chatroom_id`  | Manual chatroom id (see troubleshooting)            | `&chatroom_id=123456`       |
| `demo`         | `1` = simulate gifted subs to test the layout       | `&demo=1`                   |

**Example** — big yellow counter labeled "Gifts Today":

```
https://mrking1039.github.io/c964-capstone-project/?channel=boyking&label=Gifts%20Today&color=%23ffd54a&size=120px
```

**Test your layout right now** without waiting for a real gift:

```
https://mrking1039.github.io/c964-capstone-project/?demo=1
```

---

## How the daily reset works

The count is stored in the browser (localStorage) tagged with today's local
date. On load — and every 30 seconds while running — the widget compares the
stored date to the current date; when the day changes it resets to `0`. So it
survives OBS restarts during the day but starts fresh each morning at your
computer's local midnight.

Use `reset=session` to start at 0 on every page load, or `reset=never` for a
running all‑time total.

---

## Troubleshooting

- **A small status pill appears in the bottom‑left corner** only when something
  needs attention (looking up the channel, disconnected, or an error). A
  healthy, connected widget shows nothing but the number.

- **"Could not find chatroom for …"** — Kick's channel lookup is occasionally
  blocked by its Cloudflare protection. Fix it by supplying the chatroom id
  manually:
  1. Open `https://kick.com/api/v2/channels/boyking` in your browser.
  2. Find `"chatroom": { "id": 123456, ... }`.
  3. Add `&chatroom_id=123456` to your widget URL.

- **Number never goes up** — confirm the channel slug is correct, that you are
  actually receiving gifted subs (regular subs are not counted), and try
  `?demo=1` to verify the overlay itself renders.

- **Count looks wrong after testing** — open the widget URL in a normal browser
  tab and it shares the same stored value; clear it by loading once with
  `?reset=session`, or clear the site's browser storage.

---

## What counts as a "gifted sub"?

The widget listens for Kick's `GiftedSubscriptionsEvent` and adds the number of
recipients in each gift event (a "gift 5 subs" action adds 5). Regular
self‑subscriptions and resubs are **not** counted.
