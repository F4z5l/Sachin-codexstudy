/* Lightweight custom video player. Direct files (mp4/webm/...) play natively;
   .m3u8 uses native HLS where supported, otherwise hls.js is loaded on demand. */
(function (w) {
  'use strict';
  var HLS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
  var SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  var I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="8.2" y="15.5" font-size="7" fill="currentColor" stroke="none" font-family="Inter,sans-serif" font-weight="700">10</text></svg>',
    fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="8.2" y="15.5" font-size="7" fill="currentColor" stroke="none" font-family="Inter,sans-serif" font-weight="700">10</text></svg>',
    vol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>',
    low: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>',
    fs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    exitfs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>',
    off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="m22 8-5 4 5 4z"/><line x1="3" y1="3" x2="21" y2="21"/></svg>'
  };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* Shown when a lecture has no (valid) video URL. No <video> element is created. */
  function unavailable(root) {
    root.innerHTML = '<div class="player"><div class="pl-unavailable">' + I.off +
      '<h3>Video unavailable</h3><p>This lecture does not have a video yet. Please check back later.</p></div></div>';
  }

  var hlsPromise = null;
  function loadHls() {
    if (w.Hls) return Promise.resolve(w.Hls);
    if (!hlsPromise) {
      hlsPromise = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = HLS_SRC; s.async = true;
        s.onload = function () { w.Hls ? res(w.Hls) : rej(new Error('hls')); };
        s.onerror = function () { rej(new Error('hls')); };
        document.head.appendChild(s);
      });
    }
    return hlsPromise;
  }

  function create(host, src) {
    host.innerHTML =
      '<div class="player" tabindex="0" aria-label="Video player">' +
        '<div class="pl-stage">' +
          '<video class="pl-video" playsinline preload="metadata"></video>' +
          '<div class="pl-loading"><span class="spinner"></span></div>' +
          '<div class="pl-error" hidden><h3>Video failed to load</h3><p class="pl-error-msg"></p>' +
            '<button type="button" class="btn pl-retry">Retry</button></div>' +
          '<button type="button" class="pl-bigplay" aria-label="Play">' + I.play + '</button>' +
        '</div>' +
        '<div class="pl-controls">' +
          '<input class="pl-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek" disabled>' +
          '<div class="pl-row">' +
            '<button type="button" class="pl-btn pl-play" aria-label="Play">' + I.play + '</button>' +
            '<button type="button" class="pl-btn pl-skip pl-back" aria-label="Back 10 seconds">' + I.back + '</button>' +
            '<button type="button" class="pl-btn pl-skip pl-fwd" aria-label="Forward 10 seconds">' + I.fwd + '</button>' +
            '<button type="button" class="pl-btn pl-mute" aria-label="Mute">' + I.vol + '</button>' +
            '<input class="pl-vol" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">' +
            '<span class="pl-time">0:00 / 0:00</span>' +
            '<span class="pl-spacer"></span>' +
            '<div class="pl-speed"><button type="button" class="pl-btn pl-speed-btn" aria-label="Playback speed">1x</button>' +
              '<div class="pl-menu" hidden>' + SPEEDS.map(function (s) {
                return '<button type="button" data-speed="' + s + '"' + (s === 1 ? ' class="active"' : '') + '>' + (s === 1 ? 'Normal' : s + 'x') + '</button>';
              }).join('') + '</div></div>' +
            '<button type="button" class="pl-btn pl-fs" aria-label="Fullscreen">' + I.fs + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var root = host.querySelector('.player');
    var $ = function (sel) { return root.querySelector(sel); };
    var video = $('.pl-video'), seek = $('.pl-seek'), vol = $('.pl-vol'), time = $('.pl-time');
    var playBtn = $('.pl-play'), muteBtn = $('.pl-mute'), fsBtn = $('.pl-fs');
    var speedBtn = $('.pl-speed-btn'), menu = $('.pl-menu'), errBox = $('.pl-error');
    var dragging = false, hideTimer = null, hls = null, ptype = '', wasHidden = false;

    function setFill(el, frac) { el.style.setProperty('--p', Math.max(0, Math.min(1, frac)) * 100 + '%'); }
    function toggle() {
      if (video.paused || video.ended) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      else video.pause();
    }
    function showUI() {
      root.classList.remove('hide-ui');
      clearTimeout(hideTimer);
      if (!video.paused && menu.hidden) hideTimer = setTimeout(function () { root.classList.add('hide-ui'); }, 2800);
    }
    function updateTime() {
      var d = video.duration;
      time.textContent = fmt(video.currentTime) + ' / ' + (isFinite(d) ? fmt(d) : '--:--');
      if (!dragging && isFinite(d) && d > 0) {
        seek.value = Math.round(video.currentTime / d * 1000);
        setFill(seek, video.currentTime / d);
      }
    }
    function updateVol() {
      var muted = video.muted || video.volume === 0;
      muteBtn.innerHTML = muted ? I.mute : (video.volume < 0.5 ? I.low : I.vol);
      muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      vol.value = video.muted ? 0 : video.volume; setFill(vol, +vol.value);
    }
    function setLoading(on) { root.classList.toggle('is-loading', on); $('.pl-loading').hidden = !on; }
    function skip(sec) {
      if (!isFinite(video.duration)) return;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + sec));
    }

    function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
    function toggleFs() {
      if (fsElement()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else if (root.requestFullscreen) { root.requestFullscreen().catch(function () {}); }
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); /* iPhone Safari */
    }
    function onFs() {
      var on = fsElement() === root;
      fsBtn.innerHTML = on ? I.exitfs : I.fs;
      fsBtn.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Fullscreen');
    }
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);

    function showError(msg) {
      setLoading(false);
      root.classList.add('has-error');
      $('.pl-error-msg').textContent = msg;
      errBox.hidden = false;
    }
    function mediaMsg(err) {
      var c = err && err.code;
      if (c === 2) return 'A network error stopped the video from loading. Check your connection and try again.';
      if (c === 3) return 'The video could not be decoded. The file may be damaged.';
      if (c === 4) return 'This video link is not available or its format is not supported by your browser.';
      return 'The video could not be loaded. Please try again later.';
    }

    function attach() {
      errBox.hidden = true; root.classList.remove('has-error'); setLoading(true);
      if (hls) { hls.destroy(); hls = null; }
      var isHls = /\.m3u8(\?|#|$)/i.test(src);
      if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
        loadHls().then(function (Hls) {
          if (!Hls.isSupported()) return showError('Your browser cannot play this stream.');
          hls = new Hls();
          hls.on(Hls.Events.ERROR, function (e, data) {
            if (data && data.fatal) showError('The stream could not be loaded. Please check your connection and try again.');
          });
          hls.loadSource(src);
          hls.attachMedia(video);
        }, function () { showError('The streaming component could not be loaded. Check your connection and try again.'); });
      } else {
        video.src = src;
        video.load();
      }
    }

    /* events */
    video.addEventListener('loadedmetadata', function () { seek.disabled = false; updateTime(); });
    video.addEventListener('loadeddata', function () { setLoading(false); });
    ['canplay', 'playing', 'seeked'].forEach(function (n) { video.addEventListener(n, function () { setLoading(false); }); });
    ['waiting', 'seeking'].forEach(function (n) { video.addEventListener(n, function () { if (!video.paused || n === 'seeking') setLoading(true); }); });
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateTime);
    video.addEventListener('volumechange', updateVol);
    video.addEventListener('play', function () { playBtn.innerHTML = I.pause; playBtn.setAttribute('aria-label', 'Pause'); root.classList.add('is-playing'); showUI(); });
    video.addEventListener('pause', function () { playBtn.innerHTML = I.play; playBtn.setAttribute('aria-label', 'Play'); root.classList.remove('is-playing'); showUI(); });
    video.addEventListener('ended', function () { root.classList.remove('is-playing'); showUI(); });
    video.addEventListener('error', function () { if (!hls && video.getAttribute('src')) showError(mediaMsg(video.error)); });

    playBtn.addEventListener('click', toggle);
    $('.pl-bigplay').addEventListener('click', toggle);
    $('.pl-back').addEventListener('click', function () { skip(-10); });
    $('.pl-fwd').addEventListener('click', function () { skip(10); });
    muteBtn.addEventListener('click', function () { video.muted = !video.muted; if (!video.muted && video.volume === 0) video.volume = 0.5; });
    vol.addEventListener('input', function () { video.volume = +vol.value; video.muted = +vol.value === 0; });
    fsBtn.addEventListener('click', toggleFs);
    $('.pl-retry').addEventListener('click', attach);

    seek.addEventListener('input', function () {
      dragging = true; setFill(seek, seek.value / 1000);
      if (isFinite(video.duration)) time.textContent = fmt(seek.value / 1000 * video.duration) + ' / ' + fmt(video.duration);
    });
    seek.addEventListener('change', function () {
      if (isFinite(video.duration)) video.currentTime = seek.value / 1000 * video.duration;
      dragging = false;
    });

    speedBtn.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; showUI(); });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-speed]');
      if (!b) return;
      video.playbackRate = +b.dataset.speed;
      speedBtn.textContent = b.dataset.speed + 'x';
      Array.prototype.forEach.call(menu.children, function (c) { c.classList.toggle('active', c === b); });
      menu.hidden = true; showUI();
    });
    document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.pl-speed')) menu.hidden = true; });

    /* tap/click on the picture: on touch the first tap only reveals controls */
    var stage = $('.pl-stage');
    stage.addEventListener('pointerdown', function (e) { ptype = e.pointerType; wasHidden = root.classList.contains('hide-ui'); });
    stage.addEventListener('click', function (e) {
      if (e.target.closest('.pl-bigplay, .pl-error')) return;
      root.focus({ preventScroll: true });
      if (ptype === 'touch' && wasHidden) { showUI(); return; }
      toggle();
    });
    stage.addEventListener('dblclick', function (e) { if (!e.target.closest('.pl-bigplay, .pl-error')) toggleFs(); });
    root.addEventListener('mousemove', showUI);
    root.addEventListener('focusin', showUI);
    root.addEventListener('mouseleave', function () { if (!video.paused) root.classList.add('hide-ui'); });

    root.addEventListener('keydown', function (e) {
      if (e.target !== root) return; /* let focused buttons/sliders behave natively */
      var k = e.key;
      if (k === ' ' || k === 'k') toggle();
      else if (k === 'ArrowLeft') skip(-5);
      else if (k === 'ArrowRight') skip(5);
      else if (k === 'ArrowUp') video.volume = Math.min(1, video.volume + 0.05);
      else if (k === 'ArrowDown') video.volume = Math.max(0, video.volume - 0.05);
      else if (k === 'm') muteBtn.click();
      else if (k === 'f') toggleFs();
      else return;
      e.preventDefault(); showUI();
    });

    updateVol(); setFill(seek, 0);
    attach();
    return {
      destroy: function () {
        if (hls) hls.destroy();
        document.removeEventListener('fullscreenchange', onFs);
        document.removeEventListener('webkitfullscreenchange', onFs);
      }
    };
  }

  w.LMSPlayer = { create: create, unavailable: unavailable, esc: esc };
})(window);
