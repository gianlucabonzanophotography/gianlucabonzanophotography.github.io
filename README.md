# Gianluca Bonzano — Photography

A static personal portfolio site. Cinema-mode (pure black, white text), three galleries, image-first.

## Pages

| File | Page |
|---|---|
| `index.html` | Homepage — hero + index of three series |
| `landscape.html` | Landscape gallery |
| `cityscape.html` | Cityscape gallery |
| `street.html` | Street gallery |
| `about.html` | About + contact |
| `styles.css` | All styling |
| `photos.js` | Photo data + mosaic + lightbox |

## How to add your own photos

Open `photos.js`. The top of the file is a single `PHOTO_SETS` object with three arrays — `landscape`, `cityscape`, `street`. Each photo is one line:

```js
{ src: "images/my-photo.jpg", title: "First light, ridgeline", meta: "Dolomites · 2024", span: "span-12" },
```

- `src` — drop your image into `site/images/` and reference it as `images/your-file.jpg`. Or paste any URL. Currently every image is a free Unsplash URL.
- `title` — italicized photo title (shows on hover and in the lightbox).
- `meta` — small uppercase line, usually `Place · Year`.
- `span` — sets how big the photo is in the mosaic. Pick one:
  - `span-12` — full-width banner (use sparingly, 1× per gallery)
  - `span-8` / `span-7` — large
  - `span-6` — half
  - `span-5` / `span-4` — small (good for vertical photos)

The lightbox, hover captions, and photo count update automatically.

## How to swap your name & wordmark

Search-and-replace `Gianluca Bonzano` across `*.html`. The header wordmark is `Gianluca<span class="dot"></span>Bonzano` — split your first/last with that `<span class="dot">` for the small dot separator.

## How to fill in About / Contact

Open `about.html` and `index.html` (footer) and replace every `— add your details —` placeholder with your real info. The portrait is set as a background-image on `.portrait` near the top of `about.html`.

---

## Deploying to GitHub Pages (free, no subscription)

1. **Create a new GitHub repo.** Name it `gianlucabonzano.github.io` if you want a free `https://gianlucabonzano.github.io` URL with no path. Otherwise any name works (e.g. `portfolio`) and your URL becomes `https://<username>.github.io/portfolio/`.

2. **Put these files at the repo root.** The contents of this `site/` folder go directly at the top of the repo — `index.html` should be at the root, not inside a sub-folder.

   Example via the command line:
   ```bash
   cd site
   git init -b main
   git add .
   git commit -m "Initial site"
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```

   Or just drag the files into GitHub's web UI ("Add file → Upload files").

3. **Enable Pages.** In your repo: **Settings → Pages**. Under "Source", pick **Deploy from a branch**, select `main` and `/ (root)`, then Save.

4. **Wait ~1 minute.** Your site will be live at the URL shown on that Pages settings page.

5. **Updating.** Edit any file, push to `main`, GitHub redeploys automatically.

### Custom domain (optional, also free)
- Buy a domain from any registrar (Namecheap, Porkbun, etc).
- In your repo's **Settings → Pages**, type your domain into "Custom domain".
- At your registrar, add a CNAME record pointing your domain to `<your-username>.github.io`.
- Done. Pages issues an HTTPS certificate automatically.

---

## Other free hosts (alternatives)

- **Netlify Drop** — drag the `site/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop). Live in seconds. No account needed for the throwaway URL.
- **Cloudflare Pages** — connect a GitHub repo. Same as above, slightly faster CDN.

The site is just static HTML/CSS/JS so any free static host works.

---

## Video gallery

A fourth gallery, **Video**, works like the photo galleries but holds short films.

### Setup
1. Create a `video` folder next to your photo folders:
   `C:/Users/gianl/Pictures/definitive/website/video`
2. Drop your video files in it (`.mp4 .mov .webm .m4v .avi .mkv`).
3. Run `python build.py` as usual.

### Compression (requires ffmpeg)
Heavy source videos are automatically compressed to lean web-ready MP4s before
publishing — **only the compressed versions are pushed to GitHub, never your
500 MB originals.** This needs **ffmpeg** on your PATH (install once from
https://ffmpeg.org or `winget install ffmpeg`). If ffmpeg is missing, videos
are copied uncompressed and a warning is printed.

Tune quality vs. size in `config.yaml` under `video:`
- `crf` — quality knob. Lower = better & bigger, higher = smaller. 24 is a good default (20–28 sensible).
- `max_height` — downscales tall side to this many px (1080 = full HD; use 720 for smaller files).
- `preset` — `slow` gives smaller files; `ultrafast` is quicker but bigger.

A poster frame (~1 second in) is extracted from each video and shown in the
grid; clicking opens a fullscreen player. Videos are lazy-loaded — the file
only downloads when a visitor actually opens it.

> GitHub rejects any single file over 100 MB. Keep compressed videos under that
> (the defaults usually land well below). For very long clips, lower `crf` to
> 26–28 or `max_height` to 720.
