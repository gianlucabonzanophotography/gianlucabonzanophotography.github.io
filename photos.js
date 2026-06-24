/* ============================================================
   Gianluca Bonzano — Photography
   Site runtime
   ============================================================ */
(function () {

window.PHOTO_SETS = {};
window.SITE_CONTENT = null;

async function loadJSON(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch (e) { console.warn("Could not load " + path + ":", e.message); return null; }
}
async function bootContent() {
  const [content, photos, videos] = await Promise.all([
    loadJSON("content.json"), loadJSON("photos.json"), loadJSON("videos.json")
  ]);
  if (content) window.SITE_CONTENT = content;
  if (photos)  window.PHOTO_SETS = photos;
  // Merge videos under the "video" key. `src` is the poster (the still shown
  // in grids/previews); `video` is the actual file, lazy-loaded on open.
  if (videos && videos.video) {
    window.PHOTO_SETS = window.PHOTO_SETS || {};
    window.PHOTO_SETS.video = videos.video.map(v => ({
      src: v.poster || "", video: v.src, poster: v.poster || "",
      title: v.title || "", w: v.w, h: v.h, isVideo: true,
    }));
  }
  applyContent();
}
function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj); }
function mdInline(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/_(.+?)_/g,"<em>$1</em>");
}
function applyContent() {
  const c = window.SITE_CONTENT; if (!c) return;
  document.querySelectorAll("[data-bind]").forEach(el => {
    const v = getPath(c, el.dataset.bind); if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-bind-paragraphs]").forEach(el => {
    const v = getPath(c, el.dataset.bindParagraphs);
    if (Array.isArray(v)) el.innerHTML = v.map(p => `<p>${mdInline(p)}</p>`).join("");
  });
  document.querySelectorAll("[data-bind-bg]").forEach(el => {
    const v = getPath(c, el.dataset.bindBg);
    if (v) el.style.backgroundImage = `url('${v}')`;
  });
  document.querySelectorAll("[data-bind-src]").forEach(el => {
    const v = getPath(c, el.dataset.bindSrc);
    if (v) el.setAttribute("src", v);
  });
  const titleEl = document.querySelector("title[data-title-suffix]");
  if (titleEl && c.site && c.site.name) {
    const suffix = titleEl.dataset.titleSuffix;
    titleEl.textContent = (suffix ? suffix + " — " : "") + c.site.name;
  }
}

function initHeader() {
  const hdr = document.querySelector(".site-header"); if (!hdr) return;
  const onScroll = () => hdr.classList.toggle("scrolled", window.scrollY > 4);
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
}

function initReveal() {
  const els = document.querySelectorAll(".gallery-row, [data-reveal]");
  if (!els.length || !("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("revealed")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  els.forEach(el => io.observe(el));
}

// Right-click + drag guard, applied document-wide.
function initRightClickGuard() {
  document.addEventListener("contextmenu", (e) => { e.preventDefault(); }, true);
  document.addEventListener("dragstart", (e) => { e.preventDefault(); }, true);
}

// ============ Aspect probing & shuffle ============
function probeAspect(src, fallback) {
  const fb = fallback || 1.5;
  return new Promise((resolve) => {
    if (!src) { resolve(fb); return; }
    const img = new Image();
    img.onload = () => resolve((img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : fb);
    img.onerror = () => resolve(fb);
    img.src = src;
  });
}
function _shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ============ Homepage previews ============
async function initHomePreviews() {
  const rows = document.querySelectorAll(".gallery-row[data-gallery]");
  if (!rows.length) return;
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const key = row.dataset.gallery;
    const set = ((window.PHOTO_SETS || {})[key] || []).filter(p => p && p.src);
    if (set.length === 0) continue;
    const probed = await Promise.all(set.map(async (p) => {
      const fb = (p.w && p.h) ? p.w / p.h : 1.7778;
      return { ...p, ar: await probeAspect(p.src, fb) };
    }));
    let portraits  = probed.filter(p => p.ar < 0.95);
    let landscapes = probed.filter(p => p.ar >= 0.95);
    if (portraits.length === 0)  portraits  = probed.slice();
    if (landscapes.length === 0) landscapes = probed.slice();
    const tallSlots = Array.from(row.querySelectorAll(".preview .ph.ph-tall"));
    const wideSlots = Array.from(row.querySelectorAll(".preview .ph.ph-wide"));
    const inUse = new Set();
    const allSlotState = [];
    function buildSlot(slot, pool, initialPick) {
      const queue = _shuffle(pool);
      slot.innerHTML = "";
      const frameA = document.createElement("div"); const frameB = document.createElement("div");
      frameA.className = "frame active"; frameB.className = "frame";
      frameA.style.backgroundImage = `url('${initialPick.src}')`;
      slot.appendChild(frameA); slot.appendChild(frameB);
      inUse.add(initialPick.src);
      return { slot, queue, qi: 0, frames: [frameA, frameB], activeIdx: 0, currentSrc: initialPick.src, pendingSrc: null };
    }
    function pickFresh(pool) {
      const sh = _shuffle(pool);
      for (const p of sh) if (!inUse.has(p.src)) return p;
      return sh[0];
    }
    tallSlots.forEach((slot) => allSlotState.push(buildSlot(slot, portraits, pickFresh(portraits))));
    wideSlots.forEach((slot) => allSlotState.push(buildSlot(slot, landscapes, pickFresh(landscapes))));
    function rotateSlot(state) {
      let attempts = 0, next = null;
      const own = state.currentSrc;
      while (attempts < state.queue.length * 2) {
        const cand = state.queue[state.qi]; state.qi = (state.qi + 1) % state.queue.length; attempts++;
        if ((!inUse.has(cand.src) || cand.src === own) && cand.src !== own) { next = cand; break; }
      }
      if (!next) return;
      inUse.add(next.src); state.pendingSrc = next.src;
      const offIdx = 1 - state.activeIdx;
      const offFrame = state.frames[offIdx], onFrame = state.frames[state.activeIdx];
      const probe = new Image();
      probe.onload = () => {
        offFrame.style.backgroundImage = `url('${next.src}')`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          offFrame.classList.add("active"); onFrame.classList.remove("active");
        }));
        state.activeIdx = offIdx;
        const releasing = state.currentSrc;
        state.currentSrc = next.src;
        setTimeout(() => {
          if (state.currentSrc !== releasing && state.pendingSrc !== releasing) inUse.delete(releasing);
          state.pendingSrc = null;
        }, 1800);
      };
      probe.onerror = () => { inUse.delete(next.src); state.pendingSrc = null; };
      probe.src = next.src;
    }
    const ROTATE_MS = 5000;
    allSlotState.forEach((state, slotIdx) => {
      const initialDelay = 2800 + slotIdx * 1900 + rowIdx * 500;
      setTimeout(() => setInterval(() => rotateSlot(state), ROTATE_MS), initialDelay);
    });
  }
}

// ============================================================
// PHOTOGRAPHER GALLERY — justified rows (Flickr / 500px style).
// Photos keep their TRUE aspect ratio. We pack them into rows of
// a target height, then scale each row so it fills the full width
// edge-to-edge. Portraits and landscapes mix freely in the same
// row, so a tall photo is never stranded alone with black gaps.
// The result is an immersive, asymmetric wall — not a rigid grid.
// ============================================================

function cellHtml(p) {
  // No filename-derived title. Number shows on hover only.
  const num = String(p._i + 1).padStart(2, "0");
  const flex = p._partial ? `0 0 ${p._w}px` : `${p._w} 1 ${p._w}px`;
  const playBadge = p.isVideo ? `<div class="play-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>` : "";
  return `<figure class="gphoto${p.isVideo ? " is-video" : ""}" data-i="${p._i}" style="flex:${flex};">
    <div class="pic" style="aspect-ratio:${p.ar.toFixed(4)};">
      <img loading="lazy" src="${p.src}" alt="" />
      ${playBadge}
      <div class="guard" data-i="${p._i}"></div>
    </div>
    <figcaption><span class="num">${num}</span></figcaption>
  </figure>`;
}

// Pack photos into justified rows. Mutates each photo with _w (width px)
// and _partial (true if in an unfilled trailing row).
function buildJustifiedRows(photos, containerWidth, targetHeight, gap) {
  const rows = [];
  let row = [], arSum = 0;
  for (const p of photos) {
    row.push(p); arSum += p.ar;
    const naturalWidth = arSum * targetHeight + (row.length - 1) * gap;
    if (naturalWidth >= containerWidth) {
      finishRow(row, arSum, containerWidth, gap, false);
      rows.push(row); row = []; arSum = 0;
    }
  }
  if (row.length) {
    const naturalWidth = arSum * targetHeight + (row.length - 1) * gap;
    // If the last row is reasonably full, justify it edge-to-edge;
    // otherwise lay it at the target height, left-aligned (no huge stretch).
    if (naturalWidth >= containerWidth * 0.7) {
      finishRow(row, arSum, containerWidth, gap, false);
    } else {
      row.forEach(p => { p._w = Math.round(p.ar * targetHeight); p._partial = true; });
    }
    rows.push(row);
  }
  return rows;
}
function finishRow(row, arSum, containerWidth, gap, partial) {
  const avail = containerWidth - (row.length - 1) * gap;
  const h = avail / arSum;
  row.forEach(p => { p._w = Math.round(p.ar * h); p._partial = partial; });
}

window.renderMosaic = async function renderMosaic(setKey, mountId) {
  const set = (window.PHOTO_SETS || {})[setKey];
  const mount = document.getElementById(mountId);
  if (!set || !mount) return;
  const probed = await Promise.all(set.map(async (p, idx) => {
    const fb = (p.w && p.h) ? p.w / p.h : 1.7778;
    return { ...p, ar: await probeAspect(p.src, fb), _i: idx };
  }));

  function render() {
    const containerWidth = mount.clientWidth || mount.offsetWidth || 1200;
    const vw = window.innerWidth;
    // Target row height scales with viewport for a generous, immersive feel.
    let targetHeight;
    if (vw <= 560)       targetHeight = 300;
    else if (vw <= 900)  targetHeight = 380;
    else if (vw <= 1400) targetHeight = 460;
    else                 targetHeight = 540;
    const gap = vw <= 560 ? 8 : 14;

    // Fresh copies so repeated renders (on resize) start clean.
    const items = probed.map(p => ({ ...p }));
    const rows = buildJustifiedRows(items, containerWidth, targetHeight, gap);

    let html = "";
    for (const r of rows) {
      const partial = r[0] && r[0]._partial;
      html += `<div class="grow${partial ? " partial" : ""}" style="gap:${gap}px;">${r.map(cellHtml).join("")}</div>`;
    }
    mount.classList.add("justified");
    mount.style.setProperty("--rowgap", gap + "px");
    mount.innerHTML = html;

    mount.querySelectorAll("img").forEach(img => {
      if (img.complete) img.classList.add("loaded");
      else img.addEventListener("load", () => img.classList.add("loaded"));
    });
    mount.querySelectorAll(".guard").forEach(g => {
      g.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const i = parseInt(g.dataset.i, 10);
        if (!Number.isNaN(i)) openLightbox(setKey, i);
      });
    });
  }

  render();

  // Re-flow on resize (debounced) so rows always fill the width.
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 180); });

  const count = document.querySelector("[data-photo-count]");
  if (count) {
    const isVid = probed.length && probed[0].isVideo;
    const noun = isVid ? "video" : "photograph";
    count.textContent = probed.length === 1 ? "01 " + noun : String(probed.length).padStart(2, "0") + " " + noun + "s";
  }
};


// ============================================================
// Lightbox — click image to zoom (button + click both work).
// ============================================================
let lbState = { setKey: null, i: 0, scale: 1, x: 0, y: 0, dragging: false, startX: 0, startY: 0, ox: 0, oy: 0 };

function ensureLightbox() {
  let lb = document.getElementById("lightbox");
  if (lb) return lb;
  lb = document.createElement("div");
  lb.className = "lightbox"; lb.id = "lightbox";
  lb.innerHTML = `
    <span class="lb-count" id="lb-count"></span>
    <button class="lb-zoom-btn" id="lb-zoom" aria-label="Zoom">Zoom +</button>
    <button class="lb-close" id="lb-close" aria-label="Close">×</button>
    <button class="lb-nav lb-prev" id="lb-prev" aria-label="Previous">‹</button>
    <button class="lb-nav lb-next" id="lb-next" aria-label="Next">›</button>
    <div class="lb-stage" id="lb-stage">
      <img id="lb-img" alt="" draggable="false" />
      <video id="lb-video" playsinline controls preload="metadata" style="display:none;"></video>
      <div class="guard" id="lb-guard"></div>
    </div>
    <div class="lb-cap" id="lb-cap"></div>
  `;
  document.body.appendChild(lb);

  // Close when clicking outside the stage
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });
  document.getElementById("lb-close").addEventListener("click", (e) => { e.stopPropagation(); closeLightbox(); });
  document.getElementById("lb-prev").addEventListener("click", (e) => { e.stopPropagation(); navLightbox(-1); });
  document.getElementById("lb-next").addEventListener("click", (e) => { e.stopPropagation(); navLightbox(1); });

  // BUTTON: zoom toggle
  document.getElementById("lb-zoom").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleZoom();
  });

  // GUARD over image: click toggles zoom (NOT the stage — we want only image-area clicks to zoom)
  const guard = document.getElementById("lb-guard");
  guard.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleZoom();
  });

  // Wheel zoom on stage
  const stage = document.getElementById("lb-stage");
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    setZoom(lbState.scale + (e.deltaY > 0 ? -0.25 : 0.25));
  }, { passive: false });

  // Pan when zoomed: mousedown on guard
  guard.addEventListener("mousedown", (e) => {
    if (lbState.scale <= 1) return;
    lbState.dragging = true;
    lbState.startX = e.clientX; lbState.startY = e.clientY;
    lbState.ox = lbState.x; lbState.oy = lbState.y;
    lb.classList.add("dragging");
    e.preventDefault(); e.stopPropagation();
  });
  window.addEventListener("mousemove", (e) => {
    if (!lbState.dragging) return;
    lbState.x = lbState.ox + (e.clientX - lbState.startX);
    lbState.y = lbState.oy + (e.clientY - lbState.startY);
    applyTransform();
  });
  window.addEventListener("mouseup", () => {
    if (!lbState.dragging) return;
    lbState.dragging = false; lb.classList.remove("dragging");
  });

  // Touch pan
  guard.addEventListener("touchstart", (e) => {
    if (lbState.scale <= 1 || e.touches.length !== 1) return;
    const t = e.touches[0];
    lbState.dragging = true;
    lbState.startX = t.clientX; lbState.startY = t.clientY;
    lbState.ox = lbState.x; lbState.oy = lbState.y;
  }, { passive: true });
  guard.addEventListener("touchmove", (e) => {
    if (!lbState.dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    lbState.x = lbState.ox + (t.clientX - lbState.startX);
    lbState.y = lbState.oy + (t.clientY - lbState.startY);
    applyTransform();
  }, { passive: true });
  guard.addEventListener("touchend", () => { lbState.dragging = false; });

  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") navLightbox(-1);
    else if (e.key === "ArrowRight") navLightbox(1);
    else if (e.key === "+" || e.key === "=") setZoom(lbState.scale + 0.3);
    else if (e.key === "-" || e.key === "_") setZoom(lbState.scale - 0.3);
    else if (e.key === "0") resetZoom();
  });
  return lb;
}

function applyTransform() {
  const img = document.getElementById("lb-img"); if (!img) return;
  img.style.transform = `translate(${lbState.x}px, ${lbState.y}px) scale(${lbState.scale})`;
}
function setZoom(scale) {
  scale = Math.max(1, Math.min(4, scale));
  lbState.scale = scale;
  if (scale === 1) { lbState.x = 0; lbState.y = 0; }
  applyTransform();
  const stage = document.getElementById("lb-stage");
  if (stage) stage.classList.toggle("zoomed", scale > 1);
  const btn = document.getElementById("lb-zoom");
  if (btn) btn.textContent = scale > 1 ? "Zoom −" : "Zoom +";
}
function resetZoom() { setZoom(1); }
function toggleZoom() { setZoom(lbState.scale > 1 ? 1 : 2); }

function _stopLbVideo() {
  const v = document.getElementById("lb-video");
  if (v) { try { v.pause(); } catch (e) {} v.removeAttribute("src"); v.load(); v.style.display = "none"; }
}
function openLightbox(setKey, i) {
  ensureLightbox();
  lbState.setKey = setKey; lbState.i = i;
  resetZoom(); paintLightbox();
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  const lb = document.getElementById("lightbox"); if (!lb) return;
  _stopLbVideo();
  lb.classList.remove("open"); document.body.style.overflow = ""; resetZoom();
}
function navLightbox(dir) {
  const set = (window.PHOTO_SETS || {})[lbState.setKey]; if (!set) return;
  _stopLbVideo();
  lbState.i = (lbState.i + dir + set.length) % set.length;
  resetZoom(); paintLightbox();
}
function paintLightbox() {
  const set = (window.PHOTO_SETS || {})[lbState.setKey]; if (!set) return;
  const p = set[lbState.i];
  const img = document.getElementById("lb-img");
  const video = document.getElementById("lb-video");
  const zoomBtn = document.getElementById("lb-zoom");
  const guard = document.getElementById("lb-guard");

  if (p.isVideo) {
    // Show the player, hide the still. Lazy: src attached only now, so the
    // compressed file downloads only when a visitor actually opens it.
    img.style.display = "none";
    if (zoomBtn) zoomBtn.style.display = "none";   // zoom is meaningless for video
    if (guard) guard.style.display = "none";       // let native controls receive clicks
    video.style.display = "block";
    if (p.poster) video.setAttribute("poster", p.poster);
    video.src = p.video;
    video.load();
    const pr = video.play();
    if (pr && pr.catch) pr.catch(() => {});         // autoplay may be blocked; user can press play
  } else {
    _stopLbVideo();
    img.style.display = "block";
    if (zoomBtn) zoomBtn.style.display = "";
    if (guard) guard.style.display = "";
    img.src = p.src;
  }
  document.getElementById("lb-cap").innerHTML = "";
  document.getElementById("lb-count").textContent =
    `${String(lbState.i + 1).padStart(2, "0")} / ${String(set.length).padStart(2, "0")}`;
}

async function boot() {
  initHeader();
  initRightClickGuard();
  await bootContent();
  initReveal();
  initHomePreviews();
  if (window.__MOSAIC) renderMosaic(window.__MOSAIC.set, window.__MOSAIC.mount);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

})();
